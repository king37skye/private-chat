// =====================================================
// WEBRTC CALLING SUBSYSTEM
// =====================================================

let peerConnection;
let localStream;
let remoteStream;
let isVideoCall = false;
let currentCallTarget = null;
let activeCallState = 'idle'; // idle, ringing, connected
let ringerAudioContext;
let ringerOscillator;

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    }
  ]
};

// Web Audio API to generate a ringing sound safely without external assets
function playRingingSound() {
  if (ringerAudioContext) return;
  try {
    ringerAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create an oscillator for a classic dual-tone phone ring (e.g. UK ring)
    const playRingCycle = () => {
      if (!ringerAudioContext || activeCallState !== 'ringing') return;
      
      const osc1 = ringerAudioContext.createOscillator();
      const osc2 = ringerAudioContext.createOscillator();
      const gainNode = ringerAudioContext.createGain();
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(400, ringerAudioContext.currentTime);
      osc2.frequency.setValueAtTime(450, ringerAudioContext.currentTime);
      
      gainNode.gain.setValueAtTime(0, ringerAudioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ringerAudioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, ringerAudioContext.currentTime + 0.4);
      gainNode.gain.linearRampToValueAtTime(0, ringerAudioContext.currentTime + 0.5);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ringerAudioContext.destination);
      
      osc1.start(ringerAudioContext.currentTime);
      osc2.start(ringerAudioContext.currentTime);
      osc1.stop(ringerAudioContext.currentTime + 0.5);
      osc2.stop(ringerAudioContext.currentTime + 0.5);
      
      setTimeout(() => {
        if (activeCallState === 'ringing') playRingCycle();
      }, 2000); // Repeat every 2 seconds
    };
    
    playRingCycle();
  } catch(e) {
    console.error("Audio API failed", e);
  }
}

function stopRingingSound() {
  if (ringerAudioContext) {
    ringerAudioContext.close();
    ringerAudioContext = null;
  }
}

// ----------------------------------------------------
// UI Bindings
// ----------------------------------------------------
function showIncomingCallModal(callerName, isVideo) {
  activeCallState = 'ringing';
  playRingingSound();
  const modal = document.getElementById('incoming-call-modal');
  document.getElementById('caller-name-display').textContent = callerName;
  document.getElementById('call-type-display').textContent = isVideo ? 'Incoming Video Call...' : 'Incoming Audio Call...';
  modal.style.display = 'flex';
}

function hideIncomingCallModal() {
  activeCallState = 'idle';
  stopRingingSound();
  document.getElementById('incoming-call-modal').style.display = 'none';
}

function showActiveCallScreen() {
  stopRingingSound();
  activeCallState = 'connected';
  const callScreen = document.getElementById('active-call-screen');
  callScreen.style.display = 'flex';
  callScreen.classList.remove('minimized');
}

function hideActiveCallScreen() {
  document.getElementById('active-call-screen').style.display = 'none';
  activeCallState = 'idle';
  stopRingingSound();
}

function minimizeCall() {
  const callScreen = document.getElementById('active-call-screen');
  callScreen.classList.add('minimized');
}

function maximizeCall() {
  const callScreen = document.getElementById('active-call-screen');
  callScreen.classList.remove('minimized');
}

// ----------------------------------------------------
// Core WebRTC Setup
// ----------------------------------------------------
async function initializeMedia(video) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: video, audio: true });
    const localVideoEl = document.getElementById('local-video');
    localVideoEl.srcObject = localStream;
    // Show or hide video element based on type
    localVideoEl.style.display = video ? 'block' : 'none';
    if (!video) {
      document.getElementById('remote-video').style.display = 'none';
      document.getElementById('audio-only-avatar').style.display = 'flex';
    } else {
      document.getElementById('remote-video').style.display = 'block';
      document.getElementById('audio-only-avatar').style.display = 'none';
    }
    return true;
  } catch (err) {
    console.error("Failed to get media devices", err);
    alert("Camera/Microphone permissions denied.");
    return false;
  }
}

function setupPeerConnection() {
  peerConnection = new RTCPeerConnection(servers);
  
  remoteStream = new MediaStream();
  document.getElementById('remote-video').srcObject = remoteStream;

  // Add local tracks to peer connection
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Listen for remote tracks
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });
  };

  // Listen for ICE candidates and send to peer
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate && currentCallTarget) {
      await sendSignalingPacket(currentCallTarget, {
        type: 'call_ice',
        candidate: event.candidate
      });
    }
  };
}

// ----------------------------------------------------
// Call Actions (Initiate, Answer, End)
// ----------------------------------------------------
window.startCall = async (video) => {
  if (!currentActiveChatId) return;
  currentCallTarget = currentActiveChatId;
  isVideoCall = video;
  
  const hasMedia = await initializeMedia(video);
  if (!hasMedia) return;

  activeCallState = 'ringing';
  // Play local ringback tone (we can just use the ringing sound for now)
  playRingingSound();
  showActiveCallScreen();
  
  setupPeerConnection();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  await sendSignalingPacket(currentCallTarget, {
    type: 'call_offer',
    offer: offer,
    isVideo: video,
    callerName: window.myProfileData ? window.myProfileData.name : 'User'
  });
};

window.answerCall = async () => {
  hideIncomingCallModal();
  const hasMedia = await initializeMedia(isVideoCall);
  if (!hasMedia) {
    endCall();
    return;
  }

  showActiveCallScreen();
  setupPeerConnection();

  await peerConnection.setRemoteDescription(window.incomingOffer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  await sendSignalingPacket(currentCallTarget, {
    type: 'call_answer',
    answer: answer
  });
};

window.declineCall = async () => {
  hideIncomingCallModal();
  if (currentCallTarget) {
    await sendSignalingPacket(currentCallTarget, { type: 'call_decline' });
  }
  currentCallTarget = null;
};

window.endCall = async () => {
  if (currentCallTarget) {
    await sendSignalingPacket(currentCallTarget, { type: 'call_end' });
  }
  cleanupCall();
};

function cleanupCall() {
  hideActiveCallScreen();
  hideIncomingCallModal();
  
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  currentCallTarget = null;
  window.incomingOffer = null;
}

// ----------------------------------------------------
// Media Controls
// ----------------------------------------------------
window.toggleAudio = () => {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      document.getElementById('btn-mute').style.background = audioTrack.enabled ? 'rgba(255,255,255,0.2)' : '#FF3B30';
    }
  }
};

window.toggleVideo = () => {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      document.getElementById('btn-video').style.background = videoTrack.enabled ? 'rgba(255,255,255,0.2)' : '#FF3B30';
    }
  }
};

// ----------------------------------------------------
// Incoming Signaling Router
// ----------------------------------------------------
window.handleCallSignaling = async (from, decryptedPacket) => {
  const { type } = decryptedPacket;

  if (type === 'call_offer') {
    if (activeCallState !== 'idle') {
      // Busy
      await sendSignalingPacket(from, { type: 'call_decline' });
      return;
    }
    currentCallTarget = from;
    isVideoCall = decryptedPacket.isVideo;
    window.incomingOffer = decryptedPacket.offer;
    showIncomingCallModal(decryptedPacket.callerName || 'Unknown', isVideoCall);
  } 
  
  else if (type === 'call_answer') {
    if (peerConnection) {
      stopRingingSound();
      await peerConnection.setRemoteDescription(decryptedPacket.answer);
    }
  } 
  
  else if (type === 'call_ice') {
    if (peerConnection && peerConnection.remoteDescription) {
      try {
        await peerConnection.addIceCandidate(decryptedPacket.candidate);
      } catch(e) {
        console.error("Error adding received ice candidate", e);
      }
    }
  } 
  
  else if (type === 'call_decline') {
    stopRingingSound();
    alert("Call declined.");
    cleanupCall();
  } 
  
  else if (type === 'call_end') {
    cleanupCall();
  }
};

// Helper function to send via existing app.js E2EE relay
async function sendSignalingPacket(to, payload) {
  if (!window.db || !window.mySessionData) return;
  const myUid = window.mySessionData.uid;
  const sharedSecret = [myUid, to].sort().join('_');
  
  let encrypted;
  if (window.getContactPublicKey && window.getMyECDHPrivateKey && window.importECDHPublicKey && window.deriveECDHSharedSecret) {
    const partnerPubKeyObj = await window.getContactPublicKey(to);
    if (partnerPubKeyObj) {
      try {
        const myPrivKey = await window.getMyECDHPrivateKey();
        const partnerPubKey = await window.importECDHPublicKey(partnerPubKeyObj);
        const ecdhShared = await window.deriveECDHSharedSecret(myPrivKey, partnerPubKey);
        encrypted = await window.encryptData(payload, null, ecdhShared);
      } catch (e) {
        console.error("ECDH signaling encryption failed, falling back", e);
      }
    }
  }

  if (!encrypted) {
    encrypted = await window.encryptData(payload, sharedSecret);
  }
  
  await window.db.collection('relay').add({
    to: to,
    from: myUid,
    packet: encrypted,
    timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
  });
}
