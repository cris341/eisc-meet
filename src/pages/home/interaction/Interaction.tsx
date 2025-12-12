import { useState, useCallback } from "react";
// @ts-ignore
import { toggleAudio, toggleVideo, startScreenShare, stopScreenShare } from "../../../webrtc/webrtc.js";

export default function Interaction() {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const handleToggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    toggleAudio(newState);
  }, [isAudioEnabled]);

  const handleToggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    toggleVideo(newState);
  }, [isVideoEnabled]);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      setIsScreenSharing(false);
    } else {
      await startScreenShare();
      setIsScreenSharing(true);
    }
  }, [isScreenSharing]);

  return (
    <div className="flex gap-4 items-center justify-center ">
      {/* Audio Button */}
      
      <button
        onClick={handleToggleAudio}
        className={`
         w-4 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 shadow-lg
          ${isAudioEnabled 
            ? "bg-gray-700 hover:bg-gray-600 text-white" 
            : "bg-red-500 hover:bg-red-600 text-white"
          }
        `}
        title={isAudioEnabled ? "Silenciar micrófono" : "Activar micrófono"}
      >
        {isAudioEnabled ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        )}
      </button>

      {/* Video Button */}
      <button
        onClick={handleToggleVideo}
        className={`
          w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 shadow-lg
          ${isVideoEnabled 
            ? "bg-gray-700 hover:bg-gray-600 text-white" 
            : "bg-red-500 hover:bg-red-600 text-white"
          }
        `}
        title={isVideoEnabled ? "Apagar cámara" : "Encender cámara"}
      >
        {isVideoEnabled ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
        )}
      </button>

      {/* Screen Share Button */}
      <button
        onClick={handleToggleScreenShare}
        className={`
          w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 shadow-lg
          ${isScreenSharing 
            ? "bg-blue-600 hover:bg-blue-700 text-white" 
            : "bg-gray-700 hover:bg-gray-600 text-white"
          }
        `}
        title={isScreenSharing ? "Dejar de compartir" : "Compartir pantalla"}
      >
        {isScreenSharing ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"></path><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M17 8l5-5"></path><path d="M17 3h5v5"></path></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"></path><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="m22 3-5 5"></path><path d="m17 3 5 5"></path></svg>
        )}
      </button>
    </div>
  );
}