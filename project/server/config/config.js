export const config = {
  // HTTP server settings
  httpServer: {
    listenIp: '0.0.0.0',
    listenPort: 3001,
  },

  // HTTPS server settings (for production)
  httpsServer: {
    listenIp: '0.0.0.0',
    listenPort: 3443,
    tls: {
      cert: './server/certs/fullchain.pem',
      key: './server/certs/privkey.pem',
    },
  },

  // MediaSoup settings
  mediasoup: {
    // Worker settings
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
      ],
    },

    // Router settings
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    },

    // WebRtcTransport settings
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: null, // replace with public IP in production
        },
      ],
      maxIncomingBitrate: 1500000,
      initialAvailableOutgoingBitrate: 1000000,
    },
  },

  // STUN/TURN servers
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302'],
    },
    // Add TURN servers for production
    // {
    //   urls: ['turn:your-turn-server.com:3478'],
    //   username: 'username',
    //   credential: 'password'
    // }
  ],
};