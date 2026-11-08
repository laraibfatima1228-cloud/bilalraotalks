import { realtimeSocket } from './socket.ts';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export class BroadcasterStreamManager {
  private localStream: MediaStream | null = null;
  private isFrontCamera = true;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioDataArray: Uint8Array | null = null;
  private isMicMuted = false;
  private isCamMuted = false;

  public async initMedia(frontCamera = true): Promise<MediaStream> {
    this.isFrontCamera = frontCamera;
    this.stopMedia();

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: frontCamera ? { ideal: 'user' } : { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.setupAudioAnalyser(this.localStream);
      return this.localStream;
    } catch (err: any) {
      console.error('Failed to get camera/mic stream:', err);
      // Fallback to basic audio/video if strict constraints fail
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.setupAudioAnalyser(this.localStream);
      return this.localStream;
    }
  }

  private setupAudioAnalyser(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      source.connect(this.analyser);
      this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e) {
      console.warn('Audio analyzer could not be initialized:', e);
    }
  }

  public getAudioLevel(): number {
    if (!this.analyser || !this.audioDataArray || this.isMicMuted) return 0;
    // Cast to Uint8Array for browser compatibility
    this.analyser.getByteFrequencyData(this.audioDataArray as any);
    let sum = 0;
    for (let i = 0; i < this.audioDataArray.length; i++) {
      sum += this.audioDataArray[i];
    }
    const average = sum / this.audioDataArray.length;
    return Math.min(100, Math.round((average / 255) * 100));
  }

  public async switchCamera(): Promise<MediaStream> {
    return this.initMedia(!this.isFrontCamera);
  }

  public toggleMuteMic(): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    this.isMicMuted = !this.isMicMuted;
    audioTracks.forEach((t) => {
      t.enabled = !this.isMicMuted;
    });
    return this.isMicMuted;
  }

  public toggleMuteCam(): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    this.isCamMuted = !this.isCamMuted;
    videoTracks.forEach((t) => {
      t.enabled = !this.isCamMuted;
    });
    return this.isCamMuted;
  }

  public isUsingFrontCamera(): boolean {
    return this.isFrontCamera;
  }

  public getStream(): MediaStream | null {
    return this.localStream;
  }

  // Handle a new viewer requesting the stream
  public async handleViewerJoined(viewerId: string): Promise<void> {
    if (!this.localStream) return;

    // Close any previous peer connection for this viewer
    if (this.peerConnections.has(viewerId)) {
      this.peerConnections.get(viewerId)?.close();
      this.peerConnections.delete(viewerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(viewerId, pc);

    // Add local audio and video tracks
    this.localStream.getTracks().forEach((track) => {
      if (this.localStream) {
        pc.addTrack(track, this.localStream);
      }
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        realtimeSocket.send('webrtc:ice-candidate', {
          targetViewerId: viewerId,
          candidate: event.candidate
        });
      }
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);

      realtimeSocket.send('webrtc:offer', {
        targetViewerId: viewerId,
        sdp: offer
      });
    } catch (e) {
      console.error('Failed to create offer for viewer:', viewerId, e);
    }
  }

  public async handleAnswer(viewerId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(viewerId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Error setting remote description from viewer:', viewerId, err);
      }
    }
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    // Viewer sending candidate
    for (const pc of this.peerConnections.values()) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        // Candidate may belong to another viewer
      }
    }
  }

  public handleViewerLeft(viewerId: string): void {
    const pc = this.peerConnections.get(viewerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(viewerId);
    }
  }

  public stopMedia(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    for (const pc of this.peerConnections.values()) {
      pc.close();
    }
    this.peerConnections.clear();
  }
}

export class ViewerStreamManager {
  private pc: RTCPeerConnection | null = null;
  private remoteStream: MediaStream | null = null;
  private onStreamReadyCallback?: (stream: MediaStream) => void;
  private onConnectionStateChangeCallback?: (state: RTCPeerConnectionState) => void;

  constructor(
    onStreamReady?: (stream: MediaStream) => void,
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  ) {
    this.onStreamReadyCallback = onStreamReady;
    this.onConnectionStateChangeCallback = onConnectionStateChange;
  }

  public startViewing(viewerId: string, viewerName: string): void {
    this.cleanup();

    realtimeSocket.send('viewer:register', {
      viewerId,
      viewerName
    });
  }

  public async handleOffer(sdp: RTCSessionDescriptionInit): Promise<void> {
    this.cleanup();

    this.pc = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        this.remoteStream?.addTrack(event.track);
      }
      if (this.onStreamReadyCallback && this.remoteStream) {
        this.onStreamReadyCallback(this.remoteStream);
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc && this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(this.pc.connectionState);
      }
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        realtimeSocket.send('webrtc:ice-candidate', {
          candidate: event.candidate
        });
      }
    };

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      realtimeSocket.send('webrtc:answer', {
        sdp: answer
      });
    } catch (e) {
      console.error('Failed to handle incoming stream offer:', e);
    }
  }

  public async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.pc) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Could not add ice candidate', e);
      }
    }
  }

  public cleanup(): void {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.remoteStream = null;
  }
}
