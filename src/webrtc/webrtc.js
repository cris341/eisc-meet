import Peer from "simple-peer/simplepeer.min.js";
import io from "socket.io-client";

// URLs and credentials for WebRTC and ICE servers
const serverWebRTCUrl = import.meta.env.VITE_WEBRTC_URL;
const iceServerUrl = import.meta.env.VITE_ICE_SERVER_URL;
const iceServerUsername = import.meta.env.VITE_ICE_SERVER_USERNAME;
const iceServerCredential = import.meta.env.VITE_ICE_SERVER_CREDENTIAL;

let socket = null;
let peers = {};
let localMediaStream = null;

let currentSessionId = 0;
let mediaPromiseChain = Promise.resolve();
let onScreenShareChange = null;

/**
 * Initializes the WebRTC connection if supported.
 * @async
 * @function initWebRTC
 */
export const initWebRTC = async (username) => {
  if (Peer.WEBRTC_SUPPORT) {
    cleanupWebRTC(); // Ensure clean state
    const mySessionId = ++currentSessionId;

    try {
      // Use sequential getMedia to avoid "Device in use" errors
      const stream = await getMedia();
      
      // Check if this session is still valid
      if (mySessionId !== currentSessionId) {
          console.log("WebRTC initialization aborted: stale session");
          stream.getTracks().forEach(track => track.stop());
          return;
      }

      localMediaStream = stream;
      console.log("Local media stream obtained:", localMediaStream.id);
      
      // Start with tracks disabled as per requirement
      localMediaStream.getAudioTracks().forEach(track => track.enabled = false);
      localMediaStream.getVideoTracks().forEach(track => track.enabled = false);
      
      createLocalVideo(localMediaStream, username);
      initSocketConnection(username);
    } catch (error) {
      console.error("Failed to initialize WebRTC connection:", error);
    }
  } else {
    console.warn("WebRTC is not supported in this browser.");
  }
};

export function cleanupWebRTC() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (localMediaStream) {
    localMediaStream.getTracks().forEach(track => track.stop());
    localMediaStream = null;
  }
  Object.values(peers).forEach(peer => {
    if (peer.peerConnection) {
      peer.peerConnection.destroy();
    }
  });
  peers = {};
  
  const container = document.getElementById("video-grid");
  if (container) {
    container.innerHTML = ''; // Clear all videos
  }
}

/**
 * Gets the user's media stream (audio only).
 * @async
 * @function getMedia
 * @returns {Promise<MediaStream>} The user's media stream.
 */
async function getMedia() {
  // Chain the request to ensure we don't call getUserMedia in parallel
  const currentPromise = mediaPromiseChain.then(async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch (err) {
        console.error("Failed to get user media:", err);
        throw err;
      }
  });
  
  // Update the chain so next request waits for this one
  // We catch errors so the chain doesn't break
  mediaPromiseChain = currentPromise.catch(() => {});
  
  return currentPromise;
}

/**
 * Initializes the socket connection and sets up event listeners.
 * @function initSocketConnection
 */
function initSocketConnection(username) {
  socket = io(serverWebRTCUrl);

  socket.on("connect", () => {
    socket.emit("register", username);
  });

  socket.on("introduction", handleIntroduction);
  socket.on("newUserConnected", handleNewUserConnected);
  socket.on("userDisconnected", handleUserDisconnected);
  socket.on("signal", handleSignal);
  socket.on("user-toggled-video", handleUserToggledVideo);
}

/**
 * Handles the introduction event.
 * @param {Array<string>} otherClientIds - Array of other client IDs.
 */
function handleIntroduction(peersObj) {
  Object.entries(peersObj).forEach(([theirId, peerData]) => {
    if (theirId !== socket.id) {
      peers[theirId] = { peerConnection: createPeerConnection(theirId, true) };
      createClientMediaElements(theirId, peerData.username, peerData.isVideoEnabled);
    }
  });
}

function handleNewUserConnected(payload) {
  // payload can be just ID (old) or object {id, username} (new)
  const theirId = payload.id || payload;
  const username = payload.username || "Usuario";

  console.log("New user connected:", theirId, username);
  if (theirId !== socket.id && !(theirId in peers)) {
    peers[theirId] = {};
    createClientMediaElements(theirId, username);
  }
}

function handleUserToggledVideo({ id, isEnabled }) {
  const videoEl = document.getElementById(`${id}_video`);
  const placeholderEl = document.getElementById(`${id}_placeholder`);
  
  if (videoEl && placeholderEl) {
    videoEl.style.display = isEnabled ? "block" : "none";
    placeholderEl.style.display = isEnabled ? "none" : "flex";
  }
}

/**
 * Handles the user disconnected event.
 * @param {string} _id - The ID of the disconnected user.
 */
function handleUserDisconnected(_id) {
  if (_id !== socket.id) {
    removeClientMediaElement(_id);
    delete peers[_id];
  }
}

/**
 * Handles the signal event.
 * @param {string} to - The ID of the receiving user.
 * @param {string} from - The ID of the sending user.
 * @param {any} data - The signal data.
 */
function handleSignal(to, from, data) {
  if (to !== socket.id) return;

  let peer = peers[from];
  if (peer && peer.peerConnection) {
    peer.peerConnection.signal(data);
  } else {
    let peerConnection = createPeerConnection(from, false);
    peers[from] = { peerConnection };
    peerConnection.signal(data);
  }
}

/**
 * Creates a new peer connection.
 * @function createPeerConnection
 * @param {string} theirSocketId - The socket ID of the peer.
 * @param {boolean} [isInitiator=false] - Whether the current client is the initiator.
 * @returns {Peer} The created peer connection.
 */
function createPeerConnection(theirSocketId, isInitiator = false) {
  const iceServers = [];

  if (iceServerUrl) {
    const urls = iceServerUrl
      .split(",")
      .map(url => url.trim())
      .filter(Boolean)
      .map(url => {
        if (!/^stun:|^turn:|^turns:/.test(url)) {
          return `turn:${url}`;
        }
        return url;
      });

    urls.forEach(url => {
      const serverConfig = { urls: url };
      if (iceServerUsername) {
        serverConfig.username = iceServerUsername;
      }
      if (iceServerCredential) {
        serverConfig.credential = iceServerCredential;
      }
      iceServers.push(serverConfig);
    });
  }

  if (!iceServers.length) {
    iceServers.push({ urls: "stun:stun.l.google.com:19302" });
  } else {
    const hasTurn = iceServers.some(server =>
      Array.isArray(server.urls)
        ? server.urls.some(url => url.startsWith("turn:") || url.startsWith("turns:"))
        : server.urls.startsWith("turn:") || server.urls.startsWith("turns:")
    );
    if (!hasTurn) {
      iceServers.push({ urls: "stun:stun.l.google.com:19302" });
    }
  }

  const peerConnection = new Peer({
    initiator: isInitiator,
    stream: localMediaStream,      // <-- aquí
    config: {
      iceServers,
    },
  });

  peerConnection.on("signal", (data) =>
    socket.emit("signal", theirSocketId, socket.id, data)
  );

  // ya no necesitamos addStream en 'connect'
  // peerConnection.on("connect", () => peerConnection.addStream(localMediaStream));

  peerConnection.on("stream", (stream) =>
    updateClientMediaElements(theirSocketId, stream)
  );

  return peerConnection;
}

/**
 * Disables the outgoing media stream.
 * @function disableOutgoingStream
 */
export function toggleAudio(isEnabled) {
  if (localMediaStream) {
    localMediaStream.getAudioTracks().forEach((track) => {
      track.enabled = isEnabled;
    });
  }
}

export function toggleVideo(isEnabled) {
  if (localMediaStream) {
    localMediaStream.getVideoTracks().forEach((track) => {
      // Don't disable if it's a screen share track, or handle it differently?
      // For simplicity, just enable/disable.
      track.enabled = isEnabled;
    });
    
    // Update local UI
    const videoEl = document.getElementById("local_video");
    const placeholderEl = document.getElementById("local_placeholder");
    if (videoEl && placeholderEl) {
      videoEl.style.display = isEnabled ? "block" : "none";
      placeholderEl.style.display = isEnabled ? "none" : "flex";
    }

    // Notify others
    if (socket) {
      socket.emit("user-toggle-video", isEnabled);
    }
  }
}

let wasVideoEnabledBeforeScreenShare = false;

export async function startScreenShare() {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    if (localMediaStream) {
      const videoTrack = localMediaStream.getVideoTracks()[0];
      
      // Save current video state
      wasVideoEnabledBeforeScreenShare = videoTrack.enabled;

      // Replace track in local stream
      localMediaStream.removeTrack(videoTrack);
      localMediaStream.addTrack(screenTrack);

      // Replace track in peer connections
      Object.values(peers).forEach((peer) => {
        if (peer.peerConnection) {
          peer.peerConnection.replaceTrack(videoTrack, screenTrack, localMediaStream);
        }
      });

      // Update local video element
      const localVideo = document.getElementById("local_video");
      if (localVideo) {
        localVideo.srcObject = localMediaStream;
        // Ensure it's visible
        localVideo.style.display = "block";
        // Remove mirror effect for screen share
        localVideo.style.transform = "none";
        
        const placeholder = document.getElementById("local_placeholder");
        if (placeholder) placeholder.style.display = "none";
      }
      
      // Notify others we are "on" (even if we were off)
      socket.emit("user-toggle-video", true);

      // Handle when user stops sharing via browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    }
  } catch (error) {
    console.error("Error starting screen share:", error);
  }
}

export async function stopScreenShare() {
  try {
    const userStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const videoTrack = userStream.getVideoTracks()[0];

    if (localMediaStream) {
      const screenTrack = localMediaStream.getVideoTracks()[0];
      
      // Replace track in local stream
      localMediaStream.removeTrack(screenTrack);
      localMediaStream.addTrack(videoTrack);

      // Restore video state
      videoTrack.enabled = wasVideoEnabledBeforeScreenShare;

      // Replace track in peer connections
      Object.values(peers).forEach((peer) => {
        if (peer.peerConnection) {
          peer.peerConnection.replaceTrack(screenTrack, videoTrack, localMediaStream);
        }
      });
      
      // Stop the screen track explicitly if not already stopped
      screenTrack.stop();

      // Update local video element
      const localVideo = document.getElementById("local_video");
      const placeholder = document.getElementById("local_placeholder");

      if (localVideo) {
        localVideo.srcObject = localMediaStream;
        // Restore mirror effect for webcam
        localVideo.style.transform = "scaleX(-1)";
        
        // Update visibility based on restored state
        if (wasVideoEnabledBeforeScreenShare) {
            localVideo.style.display = "block";
            if (placeholder) placeholder.style.display = "none";
        } else {
            localVideo.style.display = "none";
            if (placeholder) placeholder.style.display = "flex";
        }
      }

      // Notify others of restored state
      socket.emit("user-toggle-video", wasVideoEnabledBeforeScreenShare);
    }
  } catch (error) {
    console.error("Error stopping screen share:", error);
  }
}

/**
 * Creates media elements for a client.
 * @function createClientMediaElements
 * @param {string} _id - The ID of the client.
 */
function createClientMediaElements(_id, username, isVideoEnabled = false) {
  const container = getVideoContainer();
  if (!container) return;

  const card = document.createElement("div");
  card.id = `${_id}_card`;
  card.classList.add("video-card");
  card.style.position = "relative";
  card.style.width = "100%";
  card.style.height = "100%";
  card.style.borderRadius = "12px";
  card.style.overflow = "hidden";
  card.style.backgroundColor = "#2d2d2d";
  card.style.border = "2px solid #6b21a8"; // Purple border
  card.style.minHeight = "200px";

  const videoEl = document.createElement("video");
  videoEl.id = `${_id}_video`;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.style.width = "100%";
  videoEl.style.height = "100%";
  videoEl.style.objectFit = "cover";
  
  // Placeholder
  const placeholder = document.createElement("div");
  placeholder.id = `${_id}_placeholder`;
  placeholder.style.position = "absolute";
  placeholder.style.top = "0";
  placeholder.style.left = "0";
  placeholder.style.width = "100%";
  placeholder.style.height = "100%";
  
  // Set initial state based on isVideoEnabled
  if (isVideoEnabled) {
    placeholder.style.display = "none";
    videoEl.style.display = "block";
  } else {
    placeholder.style.display = "flex";
    videoEl.style.display = "none";
  }

  placeholder.style.flexDirection = "column";
  placeholder.style.justifyContent = "center";
  placeholder.style.alignItems = "center";
  placeholder.style.backgroundColor = "#1a1a1a";
  placeholder.style.color = "white";
  
  const nameTag = document.createElement("div");
  nameTag.innerText = username || "Usuario";
  nameTag.style.fontSize = "1.5rem";
  nameTag.style.fontWeight = "bold";
  
  placeholder.appendChild(nameTag);

  // Name overlay for video
  const overlay = document.createElement("div");
  overlay.innerText = username || "Usuario";
  overlay.style.position = "absolute";
  overlay.style.bottom = "10px";
  overlay.style.left = "10px";
  overlay.style.color = "white";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.padding = "4px 8px";
  overlay.style.borderRadius = "4px";
  overlay.style.fontSize = "0.8rem";

  card.appendChild(videoEl);
  card.appendChild(placeholder);
  card.appendChild(overlay);
  
  container.appendChild(card);
}

/**
 * Updates media elements for a client with a new stream.
 * @function updateClientMediaElements
 * @param {string} _id - The ID of the client.
 * @param {MediaStream} stream - The new media stream.
 */
function updateClientMediaElements(_id, stream) {
  const videoEl = document.getElementById(`${_id}_video`);
  if (videoEl) {
    videoEl.srcObject = stream;
  }
}

/**
 * Removes media elements for a client.
 * @function removeClientAudioElement
 * @param {string} _id - The ID of the client.
 */
function removeClientMediaElement(_id) {
  const card = document.getElementById(`${_id}_card`);
  if (card) {
    card.remove();
  }
}

function getVideoContainer() {
  return document.getElementById("video-grid");
}

function createLocalVideo(stream, username) {
  const container = getVideoContainer();
  if (!container) return;

  const card = document.createElement("div");
  card.id = "local_card";
  card.classList.add("video-card");
  card.style.position = "relative";
  card.style.width = "100%";
  card.style.height = "100%";
  card.style.borderRadius = "12px";
  card.style.overflow = "hidden";
  card.style.backgroundColor = "#2d2d2d";
  card.style.border = "2px solid #22c55e"; // Green border
  card.style.minHeight = "200px";

  const videoEl = document.createElement("video");
  videoEl.id = "local_video";
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.muted = true;
  videoEl.srcObject = stream;
  
  videoEl.style.width = "100%";
  videoEl.style.height = "100%";
  videoEl.style.objectFit = "cover";
  videoEl.style.transform = "scaleX(-1)"; // Mirror effect
  
  // Placeholder for local user
  const placeholder = document.createElement("div");
  placeholder.id = "local_placeholder";
  placeholder.style.position = "absolute";
  placeholder.style.top = "0";
  placeholder.style.left = "0";
  placeholder.style.width = "100%";
  placeholder.style.height = "100%";
  placeholder.style.display = "flex"; // Default disabled
  videoEl.style.display = "none"; // Default disabled

  placeholder.style.flexDirection = "column";
  placeholder.style.justifyContent = "center";
  placeholder.style.alignItems = "center";
  placeholder.style.backgroundColor = "#1a1a1a";
  placeholder.style.color = "white";
  
  const nameTag = document.createElement("div");
  nameTag.innerText = (username || "Tú") + " (Tú)";
  nameTag.style.fontSize = "1.5rem";
  nameTag.style.fontWeight = "bold";
  
  placeholder.appendChild(nameTag);

  // Overlay
  const overlay = document.createElement("div");
  overlay.innerText = "Tú";
  overlay.style.position = "absolute";
  overlay.style.bottom = "10px";
  overlay.style.left = "10px";
  overlay.style.color = "white";
  overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
  overlay.style.padding = "4px 8px";
  overlay.style.borderRadius = "4px";
  overlay.style.fontSize = "0.8rem";

  card.appendChild(videoEl);
  card.appendChild(placeholder);
  card.appendChild(overlay);

  container.appendChild(card);
}
