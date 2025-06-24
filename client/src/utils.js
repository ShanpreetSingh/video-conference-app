// Generate a random peer ID
export const generatePeerId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Generate a random room ID
export const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6);
};

// Get user media with error handling
export const getUserMedia = async (constraints) => {
    try {
        return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
        console.error('Error getting user media:', error);
        throw error;
    }
};

// Get display media for screen sharing
export const getDisplayMedia = async () => {
    try {
        return await navigator.mediaDevices.getDisplayMedia({
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            },
            audio: false
        });
    } catch (error) {
        console.error('Error getting display media:', error);
        throw error;
    }
};

// Optimize video quality based on network conditions
export const optimizeVideoQuality = (peerConnection, bitrate) => {
    if (!peerConnection || !peerConnection.getSenders) return;
    
    const senders = peerConnection.getSenders();
    senders.forEach(sender => {
        if (sender.track && sender.track.kind === 'video') {
            const parameters = sender.getParameters();
            if (!parameters.encodings) {
                parameters.encodings = [{}];
            }
            
            if (bitrate) {
                parameters.encodings[0].maxBitrate = bitrate * 1000;
                sender.setParameters(parameters)
                    .catch(err => console.error('Error setting video bitrate:', err));
            }
        }
    });
};

// Detect network conditions and adjust quality
export const monitorNetwork = (peerConnection, callback) => {
    if (!peerConnection || !peerConnection.getStats) return;
    
    let lastBytesSent = 0;
    let lastTime = 0;
    
    const checkStats = async () => {
        try {
            const stats = await peerConnection.getStats();
            let bytesSent = 0;
            let packetsLost = 0;
            let packetsSent = 0;
            
            stats.forEach(report => {
                if (report.type === 'outbound-rtp' && report.kind === 'video') {
                    bytesSent += report.bytesSent || 0;
                    packetsLost += report.packetsLost || 0;
                    packetsSent += report.packetsSent || 0;
                }
            });
            
            const now = performance.now();
            const interval = (now - lastTime) / 1000; // in seconds
            
            if (lastTime > 0 && interval > 0) {
                const bitrate = (8 * (bytesSent - lastBytesSent)) / interval / 1000; // kbps
                const lossRate = packetsSent > 0 ? (packetsLost / packetsSent) * 100 : 0;
                
                if (callback) {
                    callback({ bitrate, lossRate });
                }
            }
            
            lastBytesSent = bytesSent;
            lastTime = now;
        } catch (error) {
            console.error('Error getting stats:', error);
        }
        
        setTimeout(checkStats, 2000);
    };
    
    checkStats();
};

// Create a data channel for additional features
export const createDataChannel = (peerConnection, label, options) => {
    try {
        const dataChannel = peerConnection.createDataChannel(label, options);
        
        dataChannel.onerror = error => {
            console.error('Data channel error:', error);
        };
        
        dataChannel.onmessage = event => {
            console.log('Data channel message:', event.data);
        };
        
        dataChannel.onopen = () => {
            console.log('Data channel opened');
        };
        
        dataChannel.onclose = () => {
            console.log('Data channel closed');
        };
        
        return dataChannel;
    } catch (error) {
        console.error('Error creating data channel:', error);
        return null;
    }
};