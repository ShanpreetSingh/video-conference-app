import { Device } from 'mediasoup-client';
import { Socket } from 'socket.io-client';
import { RtcDevice, Transport, Producer, Consumer, Peer } from '../types/mediasoup';

export class MediaSoupClient {
  private socket: Socket;
  private device: Device;
  private sendTransport?: Transport;
  private recvTransport?: Transport;
  private producers: Map<string, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  private peers: Map<string, Peer> = new Map();
  private localStream?: MediaStream;
  private isProducing = false;

  constructor(socket: Socket) {
    this.socket = socket;
    this.device = new Device();
  }

  async initialize() {
    try {
      // Get router RTP capabilities
      const rtpCapabilities = await new Promise((resolve, reject) => {
        this.socket.emit('get-rtp-capabilities', (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.rtpCapabilities);
          }
        });
      });

      // Load device with RTP capabilities
      await this.device.load({ routerRtpCapabilities: rtpCapabilities });
      console.log('MediaSoup device loaded');

      // Create transports
      await this.createSendTransport();
      await this.createRecvTransport();

      return true;
    } catch (error) {
      console.error('Failed to initialize MediaSoup client:', error);
      throw error;
    }
  }

  private async createSendTransport() {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-webrtc-transport', { consuming: false }, async (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        try {
          this.sendTransport = this.device.createSendTransport(response.params);

          this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              this.socket.emit('connect-transport', {
                transportId: this.sendTransport!.id,
                dtlsParameters,
              }, (response: any) => {
                if (response.error) {
                  errback(new Error(response.error));
                } else {
                  callback();
                }
              });
            } catch (error) {
              errback(error);
            }
          });

          this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
            try {
              this.socket.emit('produce', {
                transportId: this.sendTransport!.id,
                kind,
                rtpParameters,
              }, (response: any) => {
                if (response.error) {
                  errback(new Error(response.error));
                } else {
                  callback({ id: response.id });
                }
              });
            } catch (error) {
              errback(error);
            }
          });

          resolve(this.sendTransport);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private async createRecvTransport() {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-webrtc-transport', { consuming: true }, async (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        try {
          this.recvTransport = this.device.createRecvTransport(response.params);

          this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              this.socket.emit('connect-transport', {
                transportId: this.recvTransport!.id,
                dtlsParameters,
              }, (response: any) => {
                if (response.error) {
                  errback(new Error(response.error));
                } else {
                  callback();
                }
              });
            } catch (error) {
              errback(error);
            }
          });

          resolve(this.recvTransport);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async startProducing(stream: MediaStream) {
    if (!this.sendTransport || this.isProducing) return;

    try {
      this.localStream = stream;
      this.isProducing = true;

      // Produce video
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && this.device.canProduce('video')) {
        const videoProducer = await this.sendTransport.produce({
          track: videoTrack,
          codecOptions: {
            videoGoogleStartBitrate: 1000,
          },
        });
        
        this.producers.set('video', videoProducer);
        console.log('Video producer created');
      }

      // Produce audio
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack && this.device.canProduce('audio')) {
        const audioProducer = await this.sendTransport.produce({
          track: audioTrack,
        });
        
        this.producers.set('audio', audioProducer);
        console.log('Audio producer created');
      }

    } catch (error) {
      console.error('Failed to start producing:', error);
      this.isProducing = false;
      throw error;
    }
  }

  async consume(peerId: string, producerId: string, kind: 'audio' | 'video') {
    if (!this.recvTransport) return;

    try {
      const response = await new Promise((resolve, reject) => {
        this.socket.emit('consume', {
          transportId: this.recvTransport!.id,
          producerId,
          rtpCapabilities: this.device.rtpCapabilities,
        }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      const consumer = await this.recvTransport.consume(response.params);
      this.consumers.set(consumer.id, consumer);

      // Resume consumer
      await new Promise((resolve, reject) => {
        this.socket.emit('resume-consumer', {
          consumerId: consumer.id,
        }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      // Add to peer
      let peer = this.peers.get(peerId);
      if (!peer) {
        peer = { id: peerId, name: '' };
        this.peers.set(peerId, peer);
      }

      if (kind === 'video') {
        peer.videoConsumer = consumer;
      } else {
        peer.audioConsumer = consumer;
      }

      // Create stream
      if (!peer.stream) {
        peer.stream = new MediaStream();
      }
      peer.stream.addTrack(consumer.track);

      return consumer;
    } catch (error) {
      console.error('Failed to consume:', error);
      throw error;
    }
  }

  async pauseProducer(kind: 'audio' | 'video') {
    const producer = this.producers.get(kind);
    if (!producer) return;

    try {
      await new Promise((resolve, reject) => {
        this.socket.emit('pause-producer', { kind }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error(`Failed to pause ${kind} producer:`, error);
      throw error;
    }
  }

  async resumeProducer(kind: 'audio' | 'video') {
    const producer = this.producers.get(kind);
    if (!producer) return;

    try {
      await new Promise((resolve, reject) => {
        this.socket.emit('resume-producer', { kind }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.error(`Failed to resume ${kind} producer:`, error);
      throw error;
    }
  }

  getPeers() {
    return Array.from(this.peers.values());
  }

  getPeer(peerId: string) {
    return this.peers.get(peerId);
  }

  addPeer(peerId: string, name: string) {
    if (!this.peers.has(peerId)) {
      this.peers.set(peerId, { id: peerId, name });
    }
  }

  removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      if (peer.audioConsumer) {
        peer.audioConsumer.close();
      }
      if (peer.videoConsumer) {
        peer.videoConsumer.close();
      }
      this.peers.delete(peerId);
    }
  }

  close() {
    this.producers.forEach(producer => producer.close());
    this.consumers.forEach(consumer => consumer.close());
    if (this.sendTransport) this.sendTransport.close();
    if (this.recvTransport) this.recvTransport.close();
    this.peers.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
  }
}