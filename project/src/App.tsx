import React, { useState, useEffect } from 'react';
import { JoinRoom } from './components/JoinRoom';
import { VideoGrid } from './components/VideoGrid';
import { ControlPanel } from './components/ControlPanel';
import { ChatPanel } from './components/ChatPanel';
import { ParticipantsPanel } from './components/ParticipantsPanel';
import { LoadingScreen } from './components/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useMediaSoup } from './hooks/useMediaSoup';

interface AppState {
  roomId: string;
  userName: string;
  hasJoined: boolean;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    roomId: '',
    userName: '',
    hasJoined: false,
  });
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const {
    isConnected,
    isInitialized,
    peers,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    chatMessages,
    error,
    startLocalStream,
    stopLocalStream,
    toggleAudio,
    toggleVideo,
    shareScreen,
    sendChatMessage,
  } = useMediaSoup(appState.roomId, appState.userName);

  useEffect(() => {
    if (appState.hasJoined && isInitialized && !localStream) {
      startLocalStream().catch(console.error);
    }
  }, [appState.hasJoined, isInitialized, localStream, startLocalStream]);

  useEffect(() => {
    if (!showChat) {
      setUnreadMessages(prev => prev + 1);
    }
  }, [chatMessages.length, showChat]);

  useEffect(() => {
    if (showChat) {
      setUnreadMessages(0);
    }
  }, [showChat]);

  const handleJoinRoom = (roomId: string, userName: string) => {
    setAppState({
      roomId,
      userName,
      hasJoined: true,
    });
  };

  const handleLeaveRoom = () => {
    stopLocalStream();
    setAppState({
      roomId: '',
      userName: '',
      hasJoined: false,
    });
    setShowChat(false);
    setShowParticipants(false);
    setUnreadMessages(0);
  };

  const handleToggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      setUnreadMessages(0);
    }
  };

  const handleToggleParticipants = () => {
    setShowParticipants(!showParticipants);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto">
            <div className="w-8 h-8 bg-red-500 rounded-full" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Connection Error</h1>
            <p className="text-gray-300">{error}</p>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!appState.hasJoined) {
    return (
      <ErrorBoundary>
        <JoinRoom onJoin={handleJoinRoom} />
      </ErrorBoundary>
    );
  }

  if (!isConnected) {
    return <LoadingScreen message="Connecting to server..." progress={25} />;
  }

  if (!isInitialized) {
    return <LoadingScreen message="Initializing media connection..." progress={75} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col relative">
        {/* Main video area */}
        <VideoGrid
          localStream={localStream}
          peers={peers}
          currentUserName={appState.userName}
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
        />

        {/* Control panel */}
        <ControlPanel
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onShareScreen={shareScreen}
          onLeaveRoom={handleLeaveRoom}
          onToggleChat={handleToggleChat}
          onToggleParticipants={handleToggleParticipants}
          participantCount={peers.length}
          unreadMessages={unreadMessages}
        />

        {/* Chat panel */}
        {showChat && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={sendChatMessage}
            onClose={() => setShowChat(false)}
            currentUserName={appState.userName}
          />
        )}

        {/* Participants panel */}
        {showParticipants && (
          <ParticipantsPanel
            peers={peers}
            onClose={() => setShowParticipants(false)}
            currentUserName={appState.userName}
          />
        )}

        {/* Room info */}
        <div className="fixed top-4 left-4 bg-gray-900 bg-opacity-75 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
          <div className="text-sm">
            <span className="text-gray-400">Room:</span> {appState.roomId}
          </div>
        </div>

        {/* Connection status */}
        <div className="fixed top-4 right-4 bg-gray-900 bg-opacity-75 backdrop-blur-sm rounded-xl px-4 py-2 text-white">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;