const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const mediasoup = require('mediasoup');
const { createWorkers, createRouter, createWebRtcTransport } = require('./mediasoup-worker');
const config = require('./config/config');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Serve static files from client
app.use(express.static(path.join(__dirname, '../client/public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});
// Rooms state
const rooms = new Map();

// Initialize mediasoup workers
createWorkers().then(() => {
    console.log('Mediasoup workers created');
}).catch(err => {
    console.error('Failed to create mediasoup workers:', err);
    process.exit(1);
});

// Socket.IO connection handler
io.on('connection', socket => {
    console.log(`New connection: ${socket.id}`);
    
    // Handle room creation/joining
    socket.on('joinRoom', async ({ roomId, peerId }, callback) => {
        try {
            let room = rooms.get(roomId);
            
            if (!room) {
                // Create new room
                room = {
                    peers: new Map(),
                    router: await createRouter()
                };
                rooms.set(roomId, room);
                console.log(`Created new room: ${roomId}`);
            }
            
            // Add peer to room
            room.peers.set(peerId, { socket });
            socket.join(roomId);
            
            // Get router RTP capabilities
            const rtpCapabilities = room.router.rtpCapabilities;
            
            callback({
                rtpCapabilities,
                iceServers: config.iceServers,
                roomExists: room.peers.size > 1
            });
            
            console.log(`Peer ${peerId} joined room ${roomId}`);
            
            // Notify other peers in room about new peer
            socket.to(roomId).emit('newPeer', { peerId });
            
        } catch (error) {
            console.error('joinRoom error:', error);
            callback({ error: error.message });
        }
    });
    
    // Handle WebRTC transport creation
    socket.on('createTransport', async ({ roomId, peerId, consuming }, callback) => {
        try {
            const room = rooms.get(roomId);
            if (!room) throw new Error('Room not found');
            
            const transport = await createWebRtcTransport(room.router);
            
            // Store transport in peer data
            const peer = room.peers.get(peerId);
            if (!peer) throw new Error('Peer not found');
            
            if (consuming) {
                peer.consumerTransport = transport;
            } else {
                peer.producerTransport = transport;
            }
            
            callback({
                params: {
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters
                }
            });
            
        } catch (error) {
            console.error('createTransport error:', error);
            callback({ error: error.message });
        }
    });
    
    // Handle transport connection
    socket.on('connectTransport', async ({ roomId, peerId, dtlsParameters, consuming }, callback) => {
        try {
            const room = rooms.get(roomId);
            if (!room) throw new Error('Room not found');
            
            const peer = room.peers.get(peerId);
            if (!peer) throw new Error('Peer not found');
            
            const transport = consuming ? peer.consumerTransport : peer.producerTransport;
            if (!transport) throw new Error('Transport not found');
            
            await transport.connect({ dtlsParameters });
            callback({ success: true });
            
        } catch (error) {
            console.error('connectTransport error:', error);
            callback({ error: error.message });
        }
    });
    
    // Handle producer creation
    socket.on('produce', async ({ roomId, peerId, kind, rtpParameters }, callback) => {
        try {
            const room = rooms.get(roomId);
            if (!room) throw new Error('Room not found');
            
            const peer = room.peers.get(peerId);
            if (!peer) throw new Error('Peer not found');
            
            if (!peer.producerTransport) throw new Error('Producer transport not found');
            
            const producer = await peer.producerTransport.produce({
                kind,
                rtpParameters
            });
            
            peer.producers = peer.producers || new Map();
            peer.producers.set(kind, producer);
            
            // Notify other peers about new producer
            socket.to(roomId).emit('newProducer', { peerId, kind });
            
            callback({ id: producer.id });
            
        } catch (error) {
            console.error('produce error:', error);
            callback({ error: error.message });
        }
    });
    
    // Handle consumer creation
    socket.on('consume', async ({ roomId, peerId, producerPeerId, kind, rtpCapabilities }, callback) => {
        try {
            const room = rooms.get(roomId);
            if (!room) throw new Error('Room not found');
            
            const peer = room.peers.get(peerId);
            if (!peer) throw new Error('Peer not found');
            
            const producerPeer = room.peers.get(producerPeerId);
            if (!producerPeer) throw new Error('Producer peer not found');
            
            const producer = producerPeer.producers?.get(kind);
            if (!producer) throw new Error('Producer not found');
            
            if (!room.router.canConsume({
                producerId: producer.id,
                rtpCapabilities
            })) {
                throw new Error('Cannot consume');
            }
            
            const consumer = await peer.consumerTransport.consume({
                producerId: producer.id,
                rtpCapabilities,
                paused: kind === 'video'
            });
            
            peer.consumers = peer.consumers || new Map();
            peer.consumers.set(`${producerPeerId}-${kind}`, consumer);
            
            callback({
                params: {
                    id: consumer.id,
                    producerId: producer.id,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                    type: consumer.type
                }
            });
            
            // Start receiving media
            await consumer.resume();
            
        } catch (error) {
            console.error('consume error:', error);
            callback({ error: error.message });
        }
    });
    
    // Handle peer disconnection
    socket.on('disconnect', () => {
        console.log(`Connection closed: ${socket.id}`);
        
        // Find and remove peer from all rooms
        for (const [roomId, room] of rooms) {
            for (const [peerId, peer] of room.peers) {
                if (peer.socket.id === socket.id) {
                    room.peers.delete(peerId);
                    console.log(`Peer ${peerId} left room ${roomId}`);
                    
                    // Notify other peers about disconnected peer
                    socket.to(roomId).emit('peerDisconnected', { peerId });
                    
                    // Clean up if room is empty
                    if (room.peers.size === 0) {
                        rooms.delete(roomId);
                        console.log(`Room ${roomId} destroyed`);
                    }
                    
                    break;
                }
            }
        }
    });
});

// Start server
server.listen(config.server.port, config.server.host, () => {
    console.log(`Server running on http://${config.server.host}:${config.server.port}`);
});