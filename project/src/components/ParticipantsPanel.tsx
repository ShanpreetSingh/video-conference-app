import React from 'react';
import { X, Mic, MicOff, Video, VideoOff, User, Crown } from 'lucide-react';
import { Peer } from '../types/mediasoup';

interface ParticipantsPanelProps {
  peers: Peer[];
  onClose: () => void;
  currentUserName: string;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  peers,
  onClose,
  currentUserName,
}) => {
  return (
    <div className="fixed left-8 top-1/2 transform -translate-y-1/2 w-80 max-h-96 bg-gray-900 bg-opacity-95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold">
          Participants ({peers.length + 1})
        </h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participants list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Current user */}
        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-xl">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium">{currentUserName}</span>
              <div title="Host">
                <Crown className="w-4 h-4 text-yellow-500" />
              </div>
              <span className="text-xs text-gray-400">(You)</span>
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-400">Online</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
              <Mic className="w-3 h-3 text-green-400" />
            </div>
            <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
              <Video className="w-3 h-3 text-green-400" />
            </div>
          </div>
        </div>

        {/* Other participants */}
        {peers.map((peer) => (
          <div key={peer.id} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-xl">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-white font-medium">{peer.name}</span>
              </div>
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs text-gray-400">Online</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                {peer.audioConsumer ? (
                  <Mic className="w-3 h-3 text-green-400" />
                ) : (
                  <MicOff className="w-3 h-3 text-red-400" />
                )}
              </div>
              <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                {peer.videoConsumer ? (
                  <Video className="w-3 h-3 text-green-400" />
                ) : (
                  <VideoOff className="w-3 h-3 text-red-400" />
                )}
              </div>
            </div>
          </div>
        ))}

        {peers.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8">
            You're the only one here. Share the room link to invite others!
          </div>
        )}
      </div>
    </div>
  );
};