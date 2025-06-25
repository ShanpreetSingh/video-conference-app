import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  MessageCircle,
  Settings,
  Users,
} from 'lucide-react';

interface ControlPanelProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onShareScreen: () => void;
  onLeaveRoom: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  participantCount: number;
  unreadMessages: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onShareScreen,
  onLeaveRoom,
  onToggleChat,
  onToggleParticipants,
  participantCount,
  unreadMessages,
}) => {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-gray-900 bg-opacity-95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700">
        <div className="flex items-center space-x-2 p-4">
          {/* Audio toggle */}
          <button
            onClick={onToggleAudio}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 ${
              isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>

          {/* Video toggle */}
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 ${
              isVideoEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>

          {/* Screen share */}
          <button
            onClick={onShareScreen}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 ${
              isScreenSharing
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-600 mx-2" />

          {/* Participants */}
          <button
            onClick={onToggleParticipants}
            className="w-12 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 relative"
            title="Participants"
          >
            <Users className="w-5 h-5" />
            {participantCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{participantCount}</span>
              </div>
            )}
          </button>

          {/* Chat */}
          <button
            onClick={onToggleChat}
            className="w-12 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-105 relative"
            title="Chat"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              </div>
            )}
          </button>

          {/* Settings */}
          <button
            className="w-12 h-12 rounded-xl bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-105"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-600 mx-2" />

          {/* Leave room */}
          <button
            onClick={onLeaveRoom}
            className="w-12 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-200 hover:scale-105"
            title="Leave room"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};