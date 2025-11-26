import { useState, useCallback } from "react";
// @ts-ignore
import { initWebRTC } from "../../../webrtc/webrtc.js";
/**
 * Component for controlling voice input/output.
 * @returns {JSX.Element} The JSX.Element containing the voice control button.
 */
export default function Interaction() {
  const [isSpeaking, setIsSpeaking] = useState(false); // State to track if the user is speaking
  const [callPeers, setCallPeers] = useState(true); // State to track if peers should be called

  // Function to start speaking
  const speak = useCallback(() => {
    setIsSpeaking(true);

    if (callPeers) {
      
      setCallPeers(false);
      initWebRTC();
    }
  }, [callPeers]);

  // Function to stop speaking
  const stop = useCallback(() => {
    setIsSpeaking(false);
  }, []);

  return (
    <div className="container-page">
      <div className="flex flex-col gap-4 w-full">
        <div className="button-speak">
          <button onClick={isSpeaking ? stop : speak}>
            {isSpeaking ? (
              "Mutear"
            ) : (
              "Hablar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}