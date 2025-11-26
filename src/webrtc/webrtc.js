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

/**
 * Initializes the WebRTC connection if supported.
 * @async
 * @function init
 */
export const initWebRTC = async () => {

  if (Peer.WEBRTC_SUPPORT) {
    try {
      localMediaStream = await getMedia();
      console.log("Local media stream obtained.");
      console.log(localMediaStream);
      createLocalVideo(localMediaStream);
      initSocketConnection();
    } catch (error) {
      console.error("Failed to initialize WebRTC connection:", error);
    }
  } else {
    console.warn("WebRTC is not supported in this browser.");
  }
};

/**
 * Gets the user's media stream (audio only).
 * @async
 * @function getMedia
 * @returns {Promise<MediaStream>} The user's media stream.
 */
async function getMedia() {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (err) {
    console.error("Failed to get user media:", err);
    throw err;
  }
}

/**
 * Initializes the socket connection and sets up event listeners.
 * @function initSocketConnection
 */
function initSocketConnection() {
  socket = io(serverWebRTCUrl);

  socket.on("introduction", handleIntroduction);
  socket.on("newUserConnected", handleNewUserConnected);
  socket.on("userDisconnected", handleUserDisconnected);
  socket.on("signal", handleSignal);
}

/**
 * Handles the introduction event.
 * @param {Array<string>} otherClientIds - Array of other client IDs.
 */
function handleIntroduction(otherClientIds) {
  otherClientIds.forEach((theirId) => {
    if (theirId !== socket.id) {
      peers[theirId] = { peerConnection: createPeerConnection(theirId, true) };
      createClientMediaElements(theirId);
    }
  });
}

/**
 * Handles the new user connected event.
 * @param {string} theirId - The ID of the newly connected user.
 */
function handleNewUserConnected(theirId) {
  if (theirId !== socket.id && !(theirId in peers)) {
    peers[theirId] = {};
    createClientMediaElements(theirId);
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
export function disableOutgoingStream() {
  localMediaStream.getTracks().forEach((track) => {
    track.enabled = false;
  });
}

/**
 * Enables the outgoing media stream.
 * @function enableOutgoingStream
 */
export function enableOutgoingStream() {
  localMediaStream.getTracks().forEach((track) => {
    track.enabled = true;
  });
}

/**
 * Creates media elements for a client.
 * @function createClientMediaElements
 * @param {string} _id - The ID of the client.
 */
function createClientMediaElements(_id) {
  const videoEl = document.createElement("video");
  videoEl.id = `${_id}_video`;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.style.width = "300px";
  videoEl.style.margin = "10px";
  videoEl.style.borderRadius = "8px";
  videoEl.style.border = "2px solid #6b21a8"; // Purple border
  
  getVideoContainer().appendChild(videoEl);
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
  const videoEl = document.getElementById(`${_id}_video`);
  if (videoEl) {
    videoEl.remove();
  }
}

function getVideoContainer() {
  let container = document.getElementById("video-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "video-container";
    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    container.style.justifyContent = "center";
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.width = "90%";
    container.style.zIndex = "1000";
    container.style.gap = "10px";
    container.style.pointerEvents = "none"; // Let clicks pass through if empty, but videos should be clickable? Actually videos don't need interaction usually.
    // But if we want controls, we need pointerEvents auto on children.
    document.body.appendChild(container);
  }
  return container;
}

function createLocalVideo(stream) {
  const videoEl = document.createElement("video");
  videoEl.id = "local_video";
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.muted = true;
  videoEl.srcObject = stream;
  
  videoEl.style.width = "300px";
  videoEl.style.margin = "10px";
  videoEl.style.borderRadius = "8px";
  videoEl.style.border = "2px solid #22c55e"; // Green border
  videoEl.style.transform = "scaleX(-1)"; // Mirror effect

  getVideoContainer().appendChild(videoEl);
}
