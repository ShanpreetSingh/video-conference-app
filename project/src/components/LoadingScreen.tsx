import React from 'react';
import { Video, Wifi, Users } from 'lucide-react';

interface LoadingScreenProps {
  message: string;
  progress?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message, progress }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="text-center space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">VideoConf</h1>
        </div>

        {/* Animated icons */}
        <div className="flex items-center justify-center space-x-8 mb-8">
          <div className="w-12 h-12 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center animate-pulse">
            <Wifi className="w-6 h-6 text-blue-400" />
          </div>
          <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-full flex items-center justify-center animate-pulse animation-delay-200">
            <Video className="w-6 h-6 text-green-400" />
          </div>
          <div className="w-12 h-12 bg-purple-500 bg-opacity-20 rounded-full flex items-center justify-center animate-pulse animation-delay-400">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
        </div>

        {/* Loading message */}
        <div className="space-y-4">
          <p className="text-white text-lg font-medium">{message}</p>
          
          {/* Progress bar */}
          {progress !== undefined && (
            <div className="w-64 mx-auto">
              <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm mt-2">{Math.round(progress)}%</p>
            </div>
          )}
        </div>

        {/* Dots loading animation */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-200" />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-400" />
        </div>
      </div>
    </div>
  );
};