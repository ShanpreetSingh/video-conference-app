const mediasoup = require('mediasoup');
const config = require('./config/config').mediasoup;

let workers = [];
let nextWorkerIdx = 0;

const createWorkers = async () => {
    const { numWorkers } = config;
    
    for (let i = 0; i < numWorkers; i++) {
        const worker = await mediasoup.createWorker({
            logLevel: config.worker.logLevel,
            logTags: config.worker.logTags,
            rtcMinPort: config.worker.rtcMinPort,
            rtcMaxPort: config.worker.rtcMaxPort
        });
        
        worker.on('died', () => {
            console.error('Mediasoup worker died, exiting in 2 seconds...');
            setTimeout(() => process.exit(1), 2000);
        });
        
        workers.push(worker);
    }
    
    console.log(`Created ${workers.length} mediasoup workers`);
};

const getNextWorker = () => {
    const worker = workers[nextWorkerIdx];
    
    nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
    return worker;
};

const createRouter = async () => {
    const worker = getNextWorker();
    return worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
};

const createWebRtcTransport = async (router) => {
    const {
        maxIncomingBitrate,
        initialAvailableOutgoingBitrate,
        minimumAvailableOutgoingBitrate
    } = config.webRtcTransport;
    
    const transport = await router.createWebRtcTransport({
        listenIps: config.webRtcTransport.listenIps,
        enableUdp: config.webRtcTransport.enableUdp,
        enableTcp: config.webRtcTransport.enableTcp,
        preferUdp: config.webRtcTransport.preferUdp,
        initialAvailableOutgoingBitrate: initialAvailableOutgoingBitrate,
        appData: { maxIncomingBitrate }
    });
    
    if (maxIncomingBitrate) {
        try {
            await transport.setMaxIncomingBitrate(maxIncomingBitrate);
        } catch (error) {
            console.error('setMaxIncomingBitrate error:', error);
        }
    }
    
    return transport;
};

module.exports = {
    createWorkers,
    createRouter,
    createWebRtcTransport,
    getWorkerCount: () => workers.length
};
