
# VideoConf - Professional Video Conferencing Application

A modern, production-ready video conferencing application built with React, TypeScript, and MediaSoup. Features HD video calling, screen sharing, real-time chat, and participant management.



## 🚀 Features

### Core Video Conferencing
- **HD Video Calling** - High-quality video communication with adaptive bitrate
- **Crystal Clear Audio** - Opus codec for superior audio quality
- **Screen Sharing** - Share your screen with participants seamlessly
- **Multi-participant Support** - Up to 50 participants per room
- **Responsive Grid Layout** - Automatic video grid adjustment based on participant count

### User Experience
- **Real-time Chat** - In-meeting messaging with message history
- **Participant Management** - View and manage meeting participants
- **Audio/Video Controls** - Mute/unmute microphone and camera
- **Connection Status** - Real-time connection monitoring
- **Modern UI/UX** - Beautiful, intuitive interface with smooth animations

### Technical Features
- **WebRTC Technology** - Peer-to-peer communication for low latency
- **MediaSoup Integration** - Scalable media server for multi-party calls
- **Real-time Messaging** - Socket.IO for instant communication
- **Error Handling** - Comprehensive error boundaries and recovery
- **TypeScript** - Full type safety and better development experience

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and development server
- **Lucide React** - Beautiful, customizable icons

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **MediaSoup** - WebRTC media server
- **CORS** - Cross-origin resource sharing

### WebRTC & Media
- **MediaSoup Client** - Client-side WebRTC handling
- **WebRTC APIs** - Native browser media APIs
- **Opus Audio Codec** - High-quality audio compression
- **VP8/VP9/H.264 Video Codecs** - Multiple video codec support

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (version 16 or higher)
- **npm** (comes with Node.js)
- **Modern web browser** with WebRTC support (Chrome, Firefox, Safari, Edge)
- **HTTPS** (required for production deployment due to WebRTC security requirements)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone : https://github.com/ShanpreetSingh/video-conference-app
cd video-conference-app
```

### 2. Install Dependencies
```bash
# Install client dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 3. Development Setup
```bash
# Start both client and server in development mode
npm run dev
```

This will start:
- **Client**: http://localhost:5173 (Vite dev server)
- **Server**: http://localhost:3001 (Express server)

### 4. Individual Commands
```bash
# Start only the client
npm run dev:client

# Start only the server
npm run dev:server

# Build for production
npm run build

# Build server
npm run build:server

# Preview production build
npm run preview
```

## 🏗️ Project Structure

```
video-conference-app/
├── public/                     # Static assets
├── src/                        # Client source code
│   ├── components/            # React components
│   │   ├── ChatPanel.tsx     # Chat functionality
│   │   ├── ControlPanel.tsx  # Media controls
│   │   ├── ErrorBoundary.tsx # Error handling
│   │   ├── JoinRoom.tsx      # Room joining interface
│   │   ├── LoadingScreen.tsx # Loading states
│   │   ├── ParticipantsPanel.tsx # Participant management
│   │   ├── VideoGrid.tsx     # Video layout
│   │   └── VideoPlayer.tsx   # Individual video player
│   ├── hooks/                # Custom React hooks
│   │   └── useMediaSoup.ts   # MediaSoup integration
│   ├── lib/                  # Utility libraries
│   │   └── MediaSoupClient.ts # MediaSoup client wrapper
│   ├── types/                # TypeScript type definitions
│   │   └── mediasoup.ts      # MediaSoup types
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles
├── server/                    # Server source code
│   ├── config/               # Server configuration
│   │   └── config.js         # MediaSoup and server config
│   ├── package.json          # Server dependencies
│   └── server.js             # Express server with MediaSoup
├── package.json              # Client dependencies and scripts
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite configuration
```

## 🎯 Usage Guide

### Starting a Meeting
1. Open the application in your browser
2. Enter your name and a room ID
3. Click "Join Room" or generate a random room ID
4. Allow camera and microphone permissions when prompted
5. Share the room ID with other participants

### During a Meeting
- **Mute/Unmute**: Click the microphone button
- **Camera On/Off**: Click the camera button
- **Screen Share**: Click the monitor button to share your screen
- **Chat**: Click the chat button to open messaging
- **Participants**: Click the users button to see participant list
- **Leave**: Click the red phone button to leave the meeting

### Chat Features
- Send real-time messages to all participants
- View message history
- Unread message notifications
- Timestamp for each message

### Participant Management
- View all connected participants
- See audio/video status of each participant
- Host indicators and permissions

## ⚙️ Configuration

### Server Configuration
Edit `server/config/config.js` to customize:

```javascript
export const config = {
  // HTTP server settings
  httpServer: {
    listenIp: '0.0.0.0',
    listenPort: 3001,
  },
  
  // MediaSoup worker settings
  mediasoup: {
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
    },
    
    // Supported codecs
    router: {
      mediaCodecs: [
        // Audio codecs
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        // Video codecs (VP8, VP9, H.264)
        // ... see config file for full list
      ],
    },
  },
};
```

### Environment Variables
For production deployment, set these environment variables:

```bash
# Server
NODE_ENV=production
PORT=3001

# HTTPS (required for production)
HTTPS_CERT_PATH=/path/to/cert.pem
HTTPS_KEY_PATH=/path/to/key.pem

# TURN servers (recommended for production)
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=username
TURN_PASSWORD=password
```

## 🚀 Production Deployment

### 1. Build the Application
```bash
# Build client
npm run build

# Build server (if needed)
npm run build:server
```

### 2. Server Requirements
- **HTTPS Certificate** - Required for WebRTC in production
- **TURN Server** - Recommended for NAT traversal
- **Firewall Configuration** - Open ports 10000-10100 for MediaSoup
- **Domain Name** - For SSL certificate

### 3. Docker Deployment (Optional)
```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
```

### 4. Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 API Reference

### Socket.IO Events

#### Client to Server
- `join-room` - Join a meeting room
- `create-webrtc-transport` - Create WebRTC transport
- `connect-transport` - Connect transport
- `produce` - Start producing media
- `consume` - Start consuming media
- `pause-producer` - Pause media production
- `resume-producer` - Resume media production
- `chat-message` - Send chat message

#### Server to Client
- `router-rtp-capabilities` - MediaSoup router capabilities
- `peer-joined` - New participant joined
- `peer-left` - Participant left
- `new-producer` - New media producer available
- `producer-paused` - Producer paused
- `producer-resumed` - Producer resumed
- `chat-message` - Incoming chat message

### REST API Endpoints
- `GET /api/health` - Server health check
- `GET /api/rooms` - List active rooms

## 🐛 Troubleshooting

### Common Issues

#### Camera/Microphone Not Working
- Check browser permissions
- Ensure HTTPS in production
- Verify device availability

#### Connection Issues
- Check firewall settings
- Verify TURN server configuration
- Ensure proper port forwarding

#### Audio/Video Quality Issues
- Check network bandwidth
- Adjust MediaSoup codec settings
- Monitor CPU usage

### Debug Mode
Enable debug logging by setting:
```javascript
// In server/config/config.js
mediasoup: {
  worker: {
    logLevel: 'debug',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  },
}
```
## Screenshot
![image](https://github.com/user-attachments/assets/0d60c1cf-9cc8-459e-a0d7-d58f95a399cc)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed



## 🙏 Acknowledgments

- **MediaSoup** - Powerful WebRTC media server
- **Socket.IO** - Real-time communication
- **React Team** - Amazing frontend framework
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide** - Beautiful icon library


**Built with using React, TypeScript, and MediaSoup**

**Developed by Shanpreet Singh**
