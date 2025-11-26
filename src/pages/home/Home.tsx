import React, { useState, useEffect } from "react";
import Chat from "./chat/Chat";
import Interaction from "./interaction/Interaction";
// @ts-ignore
import { initWebRTC } from "../../webrtc/webrtc.js";

const Home: React.FC = () => {
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (isJoined) {
      initWebRTC(username);
    }
  }, [isJoined, username]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      setIsJoined(true);
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
            EISC Meet
          </h1>
          <form onSubmit={handleJoin} className="flex flex-col gap-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ingresa tu nombre
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                placeholder="Ej. Juan Pérez"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              Unirse a la Reunión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Header / Nav could go here */}
      
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
        {/* Video Grid Area */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div 
            id="video-grid" 
            className="flex-1 bg-black/5 dark:bg-black/20 rounded-2xl p-4 overflow-y-auto grid gap-4 auto-rows-fr"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))"
            }}
          >
            {/* Videos will be injected here by webrtc.js */}
          </div>
          
          {/* Controls Bar */}
          <div className="h-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center justify-center px-8 border border-gray-200 dark:border-gray-700 shrink-0">
            <Interaction />
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-full lg:w-96 h-[40vh] lg:h-full shrink-0">
           <Chat username={username} />
        </div>
      </div>
    </div>
  );
};

export default Home;