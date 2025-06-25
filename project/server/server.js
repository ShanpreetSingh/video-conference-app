import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { createWorker } from 'mediasoup';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config/config.js';

const app = express();
const server = createServer(app);

// CORS configuration
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));

const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Global state
let worker;
let rooms = new Map(); // Map<roomId, Room>
let peers = new Map(); // Map<socketId, Peer>

class Room {
  constructor(roomId) {
    this.id = roomId;
    this.router = null;
    this.peers = new Map(); // Map<peerId, Peer>
    this.closed = false;
  }

  addPeer(peer) {
    this.peers.set(peer.id, peer);
  }

  removePeer(peerId) {
    this.peers.delete(peerId);
  }

  close() {
    this.closed = true;
    this.peers.clear();
    if (this.router) {
      this.router.close();
    }
  }

  get peerCount() {
    return this.peers.size;
  }

  toJSON() {
    return {
      id: this.id,
      peerCount: this.peerCount,
      peers: Array.from(this.peers.values()).map(peer => ({
        id: peer.id,
        name: peer.name,
        joined: peer.joined
      }))
    };
  }
}

class Peer {
  constructor(socketId, name) {
    this.id = socketId;
    this.name = name;
    this.socket = null;
    this.room = null;
    this.device = null;
    this.rtpCapabilities = null;
    this.producers = new Map(); // Map<kind, Producer>
    this.consumers = new Map(); // Map<consumerId, Consumer>
    this.transports = new Map(); // Map<transportId, Transport>
    this.joined = new Date().toISOString();
  }

  close() {
    this.producers.forEach(producer => producer.close());
    this.consumers.forEach(consumer => consumer.close());
    this.transports.forEach(transport => transport.close());
    this.producers.clear();
    this.consumers.clear();
    this.transports.clear();
  }
}

// Initialize MediaSoup worker
async function initializeWorker() {
  worker = await createWorker({
    logLevel: config.mediasoup.worker.logLevel,
    logTags: config.mediasoup.worker.logTags,
    rtcMinPort: config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
  });

  worker.on('died', () => {
    console.error('MediaSoup worker died, exiting in 2 seconds...');
    setTimeout(() => process.exit(1), 2000);
  });

  console.log('MediaSoup worker initialized');
}

// Create router for room
async function createRoom(roomId) {
  if (rooms.has(roomId)) {
    return rooms.get(roomId);
  }

  const router = await worker.createRouter({
    mediaCodecs: config.mediasoup.router.mediaCodecs,
  });

  const room = new Room(roomId);
  room.router = router;
  rooms.set(roomId, room);

  console.log(`Room ${roomId} created`);
  return room;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-room', async ({ roomId, name }) => {
    console.log(`${socket.id} joining room ${roomId} as ${name}`);
    
    try {
      const room = await createRoom(roomId);
      const peer = new Peer(socket.id, name);
      peer.socket = socket;
      peer.room = room;

      peers.set(socket.id, peer);
      room.addPeer(peer);
      socket.join(roomId);

      // Send router RTP capabilities
      socket.emit('router-rtp-capabilities', {
        rtpCapabilities: room.router.rtpCapabilities,
      });

      // Notify other peers
      socket.to(roomId).emit('peer-joined', {
        peerId: socket.id,
        name: name,
      });

      // Send existing peers to new peer
      const existingPeers = Array.from(room.peers.values())
        .filter(p => p.id !== socket.id)
        .map(p => ({ id: p.id, name: p.name }));
      
      socket.emit('existing-peers', existingPeers);

      console.log(`${name} joined room ${roomId}. Total peers: ${room.peerCount}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('get-rtp-capabilities', (callback) => {
    const peer = peers.get(socket.id);
    if (!peer || !peer.room) {
      callback({ error: 'Peer not found' });
      return;
    }

    callback({
      rtpCapabilities: peer.room.router.rtpCapabilities,
    });
  });

  socket.on('create-webrtc-transport', async ({ consuming }, callback) => {
    const peer = peers.get(socket.id);
    if (!peer || !peer.room) {
      callback({ error: 'Peer not found' });
      return;
    }

    try {
      const transport = await peer.room.router.createWebRtcTransport({
        ...config.mediasoup.webRtcTransport,
        appData: { consuming, peerId: socket.id },
      });

      peer.transports.set(transport.id, transport);

      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });

      // Handle transport events
      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          peer.transports.delete(transport.id);
          transport.close();
        }
      });

      transport.on('close', () => {
        peer.transports.delete(transport.id);
      });

    } catch (error) {
      console.error('Error creating WebRTC transport:', error);
      callback({ error: error.message });
    }
  });

  socket.on('connect-transport', async ({ transportId, dtlsParameters }, callback) => {
    const peer = peers.get(socket.id);
    if (!peer) {
      callback({ error: 'Peer not found' });
      return;
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      callback({ error: 'Transport not found' });
      return;
    }

    try {
      await transport.connect({ dtlsParameters });
      callback({ success: true });
    } catch (error) {
      console.error('Error connecting transport:', error);
      callback({ error: error.message });
    }
  });

  socket.on('produce', async ({ transportId, kind, rtpParameters }, callback) => {
    const peer = peers.get(socket.id);
    if (!peer) {
      callback({ error: 'Peer not found' });
      return;
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      callback({ error: 'Transport not found' });
      return;
    }

    try {
      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: { peerId: socket.id, kind },
      });

      peer.producers.set(kind, producer);
      callback({ id: producer.id });

      // Notify other peers about new producer
      socket.to(peer.room.id).emit('new-producer', {
        peerId: socket.id,
        producerId: producer.id,
        kind,
      });

      producer.on('transportclose', () => {
        peer.producers.delete(kind);
        producer.close();
      });

    } catch (error) {
      console.error('Error producing:', error);
      callback({ error: error.message });
    }
  });

  socket.on('consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
    const peer = peers.get(socket.id);
    if (!peer || !peer.room) {
      callback({ error: 'Peer not found' });
      return;
    }

    const transport = peer.transports.get(transportId);
    if (!transport) {
      callback({ error: 'Transport not found' });
      return;
    }

    try {
      const canConsume = peer.room.router.canConsume({
        producerId,
        rtpCapabilities,
      });

      if (!canConsume) {
        callback({ error: 'Cannot consume' });
        return;
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });

      peer.consumers.set(consumer.id, consumer);

      callback({
        params: {
          producerId,
          id: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          type: consumer.type,
          producerPaused: consumer.producerPaused,
        },
      });

      consumer.on('transportclose', () => {
        peer.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        peer.consumers.delete(consumer.id);
        socket.emit('consumer-closed', { consumerId: consumer.id });
      });

    } catch (error) {
      console.error('Error consuming:', error);
      callback({ error: error.message });
    }
  });

  socket.on('resume-consumer', async ({ consumerId }, callback) => {
    const peer = peers.get(socket.id);
    if (!peer) {
      callback({ error: 'Peer not found' });
      return;
    }

    const consumer = peer.consumers.get(consumerId);
    if (!consumer) {
      callback({ error: 'Consumer not found' });
      return;
    }

    try {
      await consumer.resume();
      callback({ success: true });
    } catch (error) {
      console.error('Error resuming consumer:', error);
      callback({ error: error.message });
    }
  });

  socket.on('pause-producer', async ({ kind }, callback) => {
    const peer = peers.get(socket.id);
    if (!peer) {
      callback({ error: 'Peer not found' });
      return;
    }

    const producer = peer.producers.get(kind);
    if (!producer) {
      callback({ error: 'Producer not found' });
      return;
    }

    try {
      await producer.pause();
      socket.to(peer.room.id).emit('producer-paused', {
        peerId: socket.id,
        kind,
      });
      callback({ success: true });
    } catch (error) {
      console.error('Error pausing producer:', error);
      callback({ error: error.message });
    }
  });

  socket.on('resume-producer', async ({ kind }, callback) => {
    const peer = peers.get(socket.id);
    if (!peer) {
      callback({ error: 'Peer not found' });
      return;
    }

    const producer = peer.producers.get(kind);
    if (!producer) {
      callback({ error: 'Producer not found' });
      return;
    }

    try {
      await producer.resume();
      socket.to(peer.room.id).emit('producer-resumed', {
        peerId: socket.id,
        kind,
      });
      callback({ success: true });
    } catch (error) {
      console.error('Error resuming producer:', error);
      callback({ error: error.message });
    }
  });

  socket.on('chat-message', ({ message, timestamp }) => {
    const peer = peers.get(socket.id);
    if (!peer || !peer.room) return;

    socket.to(peer.room.id).emit('chat-message', {
      peerId: socket.id,
      name: peer.name,
      message,
      timestamp,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    const peer = peers.get(socket.id);
    if (peer) {
      if (peer.room) {
        peer.room.removePeer(socket.id);
        socket.to(peer.room.id).emit('peer-left', {
          peerId: socket.id,
        });

        // Clean up room if empty
        if (peer.room.peerCount === 0) {
          rooms.delete(peer.room.id);
          peer.room.close();
          console.log(`Room ${peer.room.id} closed`);
        }
      }
      
      peer.close();
      peers.delete(socket.id);
    }
  });
});

// API endpoints
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(room => room.toJSON());
  res.json(roomList);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rooms: rooms.size,
    peers: peers.size,
  });
});

// Start server
async function startServer() {
  try {
    await initializeWorker();
    
    server.listen(config.httpServer.listenPort, config.httpServer.listenIp, () => {
      console.log(`Video conference server running on ${config.httpServer.listenIp}:${config.httpServer.listenPort}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();