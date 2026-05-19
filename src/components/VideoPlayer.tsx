import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  url: string;
  startTime: string; // ISO
  watermarkText: string;
}

export default function VideoPlayer({ url, startTime, watermarkText }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<any>(null);
  const syncInterval = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize Video.js
    const player = videojs(videoRef.current, {
      autoplay: true,
      controls: false, // Totally disable controls
      fluid: true,
      sources: [{
        src: url,
        type: 'application/x-mpegURL'
      }]
    });
    
    playerRef.current = player;
    
    const enforceSync = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const elapsedSeconds = (now - start) / 1000;
      
      if (elapsedSeconds > 0) {
        const currentTime = player.currentTime() || 0;
        const drift = Math.abs(currentTime - elapsedSeconds);
        
        // If drift is more than 3 seconds or player is paused, force resync
        if (drift > 3 || player.paused()) {
           player.currentTime(elapsedSeconds);
           player.play().catch(e => console.log('Autoplay blocked:', e));
        }
      }
    };
    
    player.on('ready', () => {
      enforceSync();
      syncInterval.current = setInterval(enforceSync, 2000); // Check every 2s
    });
    
    // Prevent pausing
    player.on('pause', () => {
       enforceSync();
       player.play().catch(e => console.log('Autoplay blocked:', e));
    });

    return () => {
      if (syncInterval.current) clearInterval(syncInterval.current);
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [url, startTime]);

  return (
    <div className="relative w-full h-full bg-black">
      <div data-vjs-player>
        <video
          ref={videoRef}
          className="video-js vjs-default-skin vjs-fill"
          playsInline
        />
      </div>
      
      {/* Watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20 overflow-hidden mix-blend-overlay">
         <div className="transform -rotate-45 text-2xl font-mono text-white tracking-widest uppercase">
            {watermarkText.repeat(10)} 
         </div>
      </div>
      <div className="absolute bottom-8 right-8 pointer-events-none text-white/40 font-mono text-xs z-50">
        {watermarkText}
      </div>
      
      {/* Block interactions */}
      <div className="absolute inset-0 z-40 bg-transparent" />
    </div>
  );
}
