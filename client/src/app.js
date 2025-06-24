import {
    generatePeerId,
    generateRoomId,
    getUserMedia,
    getDisplayMedia,
    optimizeVideoQuality,
    monitorNetwork,
    createDataChannel
} from './utils.js';

// DOM elements
const localVideo = document.getElementById('localVideo');
const remoteVideos = document.getElementById('remoteVideos');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomIdInput = document.getElementById('roomIdInput');
const toggleVideoBtn = document.getElementById('toggleVideoBtn');
const toggleAudioBtn = document.getElementById('toggleAudioBtn');
const screenShareBtn = document.getElementById('screenShareBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const currentRoomId = document.getElementById('currentRoomId');
const peerIdDisplay = document.getElementById('peerIdDisplay');

// App state
let socket;
let peerId = generatePeerId();
let roomId = '';
let localStream;
let screenStream;
let producerTransport;
let consumerTransports = {};
let producers = {};
let consumers = {};
let rtpCapabilities;
let isVideoOn = true;
let isAudioOn = true;
let isScreenSharing = false;
let dataChannel;

// Initialize the app
const init = () => {
    peerIdDisplay.textContent = peerId;
    
    // Connect to Socket.IO server
    socket = io();
    
    // Socket.IO event handlers
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        leaveRoom();
    });
    
    socket.on('newPeer', ({ peerId }) => {
        console.log(`New peer connected: ${peerId}`);
        createConsumerTransports(peerId);
    });
    
    socket.on('newProducer', ({ peerId, kind }) => {
        console.log(`New producer available: ${peerId} - ${kind}`);
        if (peerId !== socket.id && !consumers[`${peerId}-${kind}`]) {
            consume(peerId, kind);
        }
    });
    
    socket.on('peerDisconnected', ({ peerId }) => {
        console.log(`Peer disconnected: ${peerId}`);
        removePeer(peerId);
    });
    
    // Button event listeners
    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', joinRoom);
    toggleVideoBtn.addEventListener('click', toggleVideo);
    toggleAudioBtn.addEventListener('click', toggleAudio);
    screenShareBtn.addEventListener('click', toggleScreenShare);
    leaveRoomBtn.addEventListener('click', leaveRoom);
    
    // Get user media for local video
    startLocalStream();
};

// Start local video stream
const startLocalStream = async () => {
    try {
        localStream = await getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Error starting local stream:', error);
        alert('Could not access camera/microphone. Please check permissions.');
    }
};

// Create a new room
const createRoom = async () => {
    roomId = generateRoomId();
    roomIdInput.value = roomId;
    await joinRoom();
};

// Join an existing room
const joinRoom = async () => {
    if (!roomIdInput.value) {
        alert('Please enter a room ID');
        return;
    }
    
    roomId = roomIdInput.value;
    
    try {
        // Join the room on the server
        const response = await new Promise((resolve, reject) => {
            socket.emit('joinRoom', { roomId, peerId }, (data) => {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve(data);
                }
            });
        });
        
        rtpCapabilities = response.rtpCapabilities;
        currentRoomId.textContent = roomId;
        
        // Enable/disable buttons
        createRoomBtn.disabled = true;
        joinRoomBtn.disabled = true;
        leaveRoomBtn.disabled = false;
        
        // Create producer transport
        await createProducerTransport();
        if (response.roomExists) {
        }
        
        console.log(`Joined room ${roomId}`);
    } catch (error) {
        console.error('Error joining room:', error);
        alert(`Could not join room: ${error}`);
    }
};

// Create producer transport
const createProducerTransport = async () => {
    try {
        const transport = await new Promise((resolve, reject) => {
            socket.emit('createTransport', { roomId, peerId, consuming: false }, (data) => {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve(data.params);
                }
            });
        });
        
        producerTransport = new RTCPeerConnection({
            iceServers: config.iceServers
        });
        
        // Add ICE candidate handler
        producerTransport.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit('transportCandidate', {
                    roomId,
                    peerId,
                    candidate,
                    consuming: false
                });
            }
        };
        
        // Connect transport
        await new Promise((resolve, reject) => {
            socket.emit('connectTransport', {
                roomId,
                peerId,
                dtlsParameters: producerTransport.localDescription,
                consuming: false
            }, (data) => {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve();
                }
            });
        });
        
        // Start producing audio and video
        await produce('audio');
        await produce('video');
        
        // Create data channel for additional features
        dataChannel = createDataChannel(producerTransport, 'chat');
        
        // Monitor network conditions
        monitorNetwork(producerTransport, ({ bitrate, lossRate }) => {
            console.log(`Current bitrate: ${bitrate.toFixed(2)} kbps, Loss rate: ${lossRate.toFixed(2)}%`);
            
            // Adjust video quality based on network conditions
            if (lossRate > 5) {
                // Reduce bitrate if packet loss is high
                const newBitrate = Math.max(300, bitrate * 0.8);
                optimizeVideoQuality(producerTransport, newBitrate);
            } else if (lossRate < 2 && bitrate < 2000) {
                // Increase bitrate if network is good
                const newBitrate = Math.min(2000, bitrate * 1.2);
                optimizeVideoQuality(producerTransport, newBitrate);
            }
        });
        
    } catch (error) {
        console.error('Error creating producer transport:', error);
        throw error;
    }
};

// Create consumer transports for a peer
const createConsumerTransports = async (peerId) => {
    try {
        const transport = await new Promise((resolve, reject) => {
            socket.emit('createTransport', { roomId, peerId, consuming: true }, (data) => {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve(data.params);
                }
            });
        });
        
        const consumerTransport = new RTCPeerConnection({
            iceServers: config.iceServers
        });
        
        // Add ICE candidate handler
        consumerTransport.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit('transportCandidate', {
                    roomId,
                    peerId,
                    candidate,
                    consuming: true
                });
            }
        };
        
        // Connect transport
        await new Promise((resolve, reject) => {
            socket.emit('connectTransport', {
                roomId,
                peerId,
                dtlsParameters: consumerTransport.localDescription,
                consuming: true
            }, (data) => {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve();
                }
            });
        });
        
        consumerTransports[peerId] = consumerTransport;
        
        // Start consuming audio and video from this peer
        await consume(peerId, 'audio');
        await consume(peerId, 'video');
        
    } catch (error) {
        console.error('Error creating consumer transport:', error);
    }
};

// Produce media of a given kind
const produce = async (kind) => {
    if (!producerTransport) return;
    
    try {
        let track;
        
        if (kind === 'audio') {
            track = localStream.getAudioTracks()[0];
        } else if (kind === 'video') {
            track = isScreenSharing && screenStream ? 
                screenStream.getVideoTracks()[0] : 
                localStream.getVideoTracks()[0];
        }
        
        if (!track) return;
        
        const producer = await producerTransport.addTrack(track, localStream);
        
        const { id } = await new Promise((resolve, reject) => {
            socket.emit('produce', {
                roomId,
                peerId,
                kind,
                rtpParameters: producer.getParameters()
            }, (data) => {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve(data);
                }
            });
        });
        
        producer.id = id;
        producers[kind] = producer;
        
        // Handle producer events
        producer.on('trackended', () => {
            console.log(`${kind} track ended`);
            delete producers[kind];
        });
        
        console.log(`Producing ${kind}`);
    } catch (error) {
        console.error(`Error producing ${kind}:`, error);
    }
};

// Consume media of a given kind from a peer
const consume = async (peerId, kind) => {
    if (!consumerTransports[peerId] || !rtpCapabilities) return;
    
    try {
        const { id, producerId, kind: trackKind, rtpParameters } = await new Promise((resolve, reject) => {
            socket.emit('consume', {
                roomId,
                peerId,
                producerPeerId: peerId,
                kind,
                rtpCapabilities
            }, (data) => {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve(data.params);
                }
            });
        });
        
        const consumer = await consumerTransports[peerId].addTransceiver(trackKind, {
            direction: 'recvonly',
            streams: [new MediaStream()]
        }).receiver.track;
        
        consumers[`${peerId}-${kind}`] = { id, consumer };
        
        // Create video element for remote stream
        if (kind === 'video') {
            addRemoteVideo(peerId, consumer);
        }
        
        console.log(`Consuming ${kind} from ${peerId}`);
    } catch (error) {
        console.error(`Error consuming ${kind} from ${peerId}:`, error);
    }
};

// Add remote video element
const addRemoteVideo = (peerId, track) => {
    // Check if video element already exists
    const existingVideo = document.getElementById(`remoteVideo-${peerId}`);
    if (existingVideo) return;
    
    const remoteVideoContainer = document.createElement('div');
    remoteVideoContainer.className = 'remote-video';
    remoteVideoContainer.id = `remoteVideoContainer-${peerId}`;
    
    const remoteVideo = document.createElement('video');
    remoteVideo.id = `remoteVideo-${peerId}`;
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    
    const videoInfo = document.createElement('div');
    videoInfo.className = 'video-info';
    videoInfo.textContent = `Peer ${peerId.substring(0, 8)}`;
    
    const stream = new MediaStream();
    stream.addTrack(track);
    remoteVideo.srcObject = stream;
    
    remoteVideoContainer.appendChild(remoteVideo);
    remoteVideoContainer.appendChild(videoInfo);
    remoteVideos.appendChild(remoteVideoContainer);
};

// Remove peer's video element
const removePeer = (peerId) => {
    const videoContainer = document.getElementById(`remoteVideoContainer-${peerId}`);
    if (videoContainer) {
        videoContainer.remove();
    }
    
    // Clean up consumers
    Object.keys(consumers).forEach(key => {
        if (key.startsWith(`${peerId}-`)) {
            delete consumers[key];
        }
    });
    
    // Clean up transport
    if (consumerTransports[peerId]) {
        consumerTransports[peerId].close();
        delete consumerTransports[peerId];
    }
};

// Toggle local video
const toggleVideo = () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        isVideoOn = !videoTrack.enabled;
        videoTrack.enabled = isVideoOn;
        toggleVideoBtn.textContent = isVideoOn ? 'Video On' : 'Video Off';
        toggleVideoBtn.classList.toggle('active', isVideoOn);
        
        if (producers.video) {
            if (isVideoOn) {
                produce('video');
            } else {
                producers.video.stop();
                delete producers.video;
            }
        }
    }
};

// Toggle local audio
const toggleAudio = () => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        isAudioOn = !audioTrack.enabled;
        audioTrack.enabled = isAudioOn;
        toggleAudioBtn.textContent = isAudioOn ? 'Audio On' : 'Audio Off';
        toggleAudioBtn.classList.toggle('active', isAudioOn);
        
        if (producers.audio) {
            if (isAudioOn) {
                produce('audio');
            } else {
                producers.audio.stop();
                delete producers.audio;
            }
        }
    }
};

// Toggle screen sharing
const toggleScreenShare = async () => {
    try {
        if (isScreenSharing) {
            // Stop screen sharing
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
                screenStream = null;
            }
            
            isScreenSharing = false;
            screenShareBtn.textContent = 'Share Screen';
            
            // Switch back to camera
            if (producers.video) {
                producers.video.stop();
                delete producers.video;
            }
            
            if (isVideoOn) {
                await produce('video');
            }
        } else {
            // Start screen sharing
            screenStream = await getDisplayMedia();
            
            // Replace video track with screen share
            if (producers.video) {
                producers.video.stop();
                delete producers.video;
            }
            
            await produce('video');
            
            isScreenSharing = true;
            screenShareBtn.textContent = 'Stop Sharing';
            
            // Handle when user stops screen sharing from browser UI
            screenStream.getVideoTracks()[0].onended = () => {
                toggleScreenShare();
            };
        }
    } catch (error) {
        console.error('Error toggling screen share:', error);
    }
};

// Leave the current room
const leaveRoom = () => {
    if (!roomId) return;
    
    // Stop all producers
    Object.values(producers).forEach(producer => {
        producer.stop();
    });
    
    // Close all consumer transports
    Object.values(consumerTransports).forEach(transport => {
        transport.close();
    });
    
    // Remove all remote videos
    while (remoteVideos.firstChild) {
        remoteVideos.removeChild(remoteVideos.firstChild);
    }
    
    // Reset state
    producers = {};
    consumers = {};
    consumerTransports = {};
    
    // Notify server
    socket.emit('leaveRoom', { roomId, peerId });
    
    // Update UI
    currentRoomId.textContent = 'Not in a room';
    createRoomBtn.disabled = false;
    joinRoomBtn.disabled = false;
    leaveRoomBtn.disabled = true;
    
    roomId = '';
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);