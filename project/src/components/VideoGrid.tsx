import React from 'react';
import { VideoPlayer } from './VideoPlayer';
import { Peer } from '../types/mediasoup';

interface VideoGridProps {
  localStream: MediaStream | null;
  peers: Peer[];
  currentUserName: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  peers,
  currentUserName,
  isAudioEnabled,
  isVideoEnabled,
}) => {
  const totalParticipants = peers.length + 1; // +1 for local user

  const getGridLayout = () => {
    if (totalParticipants <= 1) return 'grid-cols-1';
    if (totalParticipants <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
    if (totalParticipants <= 9) return 'grid-cols-3';
    return 'grid-cols-3 md:grid-cols-4';
  };

  const getVideoHeight = () => {
    if (totalParticipants <= 1) return 'h-96 md:h-[500px]';
    if (totalParticipants <= 2) return 'h-64 md:h-80';
    if (totalParticipants <= 4) return 'h-48 md:h-64';
    if (totalParticipants <= 9) return 'h-40 md:h-48';
    return 'h-32 md:h-40';
  };

  return (
    <div className="flex-1 p-8 overflow-hidden">
      <div className={`grid ${getGridLayout()} gap-4 h-full`}>
        {/* Local video */}
        <VideoPlayer
          stream={localStream || undefined}
          name={currentUserName}
          isLocal={true}
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          className={`${getVideoHeight()} min-w-0`}
        />

        {/* Remote videos */}
        {peers.map((peer) => (
          <VideoPlayer
            key={peer.id}
            stream={peer.stream}
            name={peer.name}
            isLocal={false}
            isAudioEnabled={!!peer.audioConsumer}
            isVideoEnabled={!!peer.videoConsumer}
            className={`${getVideoHeight()} min-w-0`}
          />
        ))}
      </div>
    </div>
  );
};