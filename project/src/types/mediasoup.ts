export interface RtcDevice {
  load: (rtpCapabilities: any) => Promise<void>;
  canProduce: (kind: 'audio' | 'video') => boolean;
  createSendTransport: (params: any) => Transport;
  createRecvTransport: (params: any) => Transport;
  rtpCapabilities: any;
}

export interface Transport {
  id: string;
  on: (event: string, handler: (...args: any[]) => void) => void;
  produce: (params: any) => Promise<Producer>;
  consume: (params: any) => Promise<Consumer>;
  close: () => void;
}

export interface Producer {
  id: string;
  kind: 'audio' | 'video';
  track: MediaStreamTrack;
  paused: boolean;
  close: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  on: (event: string, handler: (...args: any[]) => void) => void;
}

export interface Consumer {
  id: string;
  kind: 'audio' | 'video';
  track: MediaStreamTrack;
  paused: boolean;
  close: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  on: (event: string, handler: (...args: any[]) => void) => void;
}

export interface Peer {
  id: string;
  name: string;
  audioProducer?: Producer;
  videoProducer?: Producer;
  audioConsumer?: Consumer;
  videoConsumer?: Consumer;
  stream?: MediaStream;
}

export interface ChatMessage {
  peerId: string;
  name: string;
  message: string;
  timestamp: string;
}