import React, { useRef, useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  PhoneOff,
  User,
  Sparkles,
} from 'lucide-react';

export default function VideoCall({ sessionId, activeUsers = [] }) {
  const { socket } = useSocket();
  const { user } = useAuth();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    let mounted = true;

    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!mounted) return;
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize PeerConnection
        setupPeerConnection(stream);
      } catch (err) {
        console.warn('Camera/Mic permission unavailable or denied:', err.message);
        setMediaError('Audio/Video hardware unavailable or blocked by browser permissions.');
      }
    };

    startMedia();

    return () => {
      mounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  const setupPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Listen for remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setHasRemoteStream(true);
        }
      }
    };

    // Send ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-ice-candidate', {
          candidate: event.candidate,
          sessionId,
        });
      }
    };

    // Socket signaling listeners
    socket?.on('webrtc-offer', async ({ senderSocketId, offer }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', {
          targetSocketId: senderSocketId,
          answer,
        });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    socket?.on('webrtc-answer', async ({ answer }) => {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    });

    socket?.on('webrtc-ice-candidate', async ({ candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    // If another peer joins, initiate offer
    socket?.on('user-joined', async ({ user: joinedUser }) => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-offer', {
          sessionId,
          targetSocketId: joinedUser.socketId,
          offer,
        });
      } catch (err) {
        console.error('Error initiating WebRTC offer:', err);
      }
    });
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.warn('Screen share canceled:', err.message);
    }
  };

  const stopScreenShare = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (peerConnectionRef.current && videoTrack) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    setIsScreenSharing(false);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 p-4">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center">
        {/* Local Participant Tile */}
        <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center group">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover mirror ${!isCameraOn ? 'hidden' : 'block'}`}
          />
          {!isCameraOn && (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl font-bold text-white">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-xs font-mono">Camera Off</span>
            </div>
          )}

          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-medium text-white flex items-center gap-2">
            <span>{user?.name || 'You'} (You)</span>
            {!isMicOn && <MicOff className="h-3 w-3 text-rose-400" />}
          </div>
        </div>

        {/* Remote Participant Tile */}
        <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${hasRemoteStream ? 'block' : 'hidden'}`}
          />
          {!hasRemoteStream && (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <div className="h-16 w-16 rounded-full bg-slate-800/60 border border-slate-800 flex items-center justify-center text-xl font-bold text-slate-400">
                <User className="h-8 w-8" />
              </div>
              <span className="text-xs font-mono">Waiting for peer to join call...</span>
            </div>
          )}

          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-medium text-white">
            Peer / Collaborator
          </div>
        </div>
      </div>

      {mediaError && (
        <div className="mt-2 text-center text-xs text-amber-400/90 font-mono">
          ℹ️ {mediaError} WebRTC audio/video will activate when camera access is granted.
        </div>
      )}

      {/* Floating Bottom Media Controls */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={toggleMic}
          className={`p-3 rounded-xl border transition-all ${
            isMicOn
              ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30'
          }`}
          title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleCamera}
          className={`p-3 rounded-xl border transition-all ${
            isCameraOn
              ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
              : 'bg-rose-500/20 border-rose-500/30 text-rose-400 hover:bg-rose-500/30'
          }`}
          title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
        >
          {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-xl border transition-all ${
            isScreenSharing
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <ScreenShare className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
