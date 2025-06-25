import React, { useState } from 'react';
import { Video, User, ArrowRight, Users, Globe } from 'lucide-react';

interface JoinRoomProps {
  onJoin: (roomId: string, userName: string) => void;
}

export const JoinRoom: React.FC<JoinRoomProps> = ({ onJoin }) => {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !userName.trim()) return;
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
    onJoin(roomId.trim(), userName.trim());
  };

  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomId(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">VideoConf</h1>
          </div>
          <p className="text-gray-300 text-lg">Professional video conferencing made simple</p>
        </div>

        {/* Join form */}
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-300 mb-2">
                Your Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  placeholder="Enter your name"
                  required
                  maxLength={50}
                />
              </div>
            </div>

            <div>
              <label htmlFor="roomId" className="block text-sm font-medium text-gray-300 mb-2">
                Room ID
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="roomId"
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toLowerCase())}
                  className="w-full bg-gray-700 text-white rounded-xl pl-11 pr-20 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  placeholder="Enter room ID"
                  required
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={generateRoomId}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded bg-blue-500 bg-opacity-20 hover:bg-opacity-30 transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!roomId.trim() || !userName.trim() || isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <span>Join Room</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-xl flex items-center justify-center mx-auto">
                  <Video className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-sm text-gray-300">HD Video</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-xl flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-sm text-gray-300">Up to 50 people</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          Powered by WebRTC & MediaSoup
        </div>
      </div>
    </div>
  );
};