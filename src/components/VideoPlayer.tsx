import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { VolumeX, Volume2, Maximize, Minimize, ArrowLeft } from 'lucide-react';
import { useServerTime } from '../hooks/useServerTime';
import { AnimatePresence, motion } from 'framer-motion';

interface VideoPlayerProps {
  url: string;
  videoSourceType: 'upload' | 'embed' | 'hls';
  startTime: string; // ISO
  watermarkText: string;
  isCustomFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

export default function VideoPlayer({ 
  url, 
  videoSourceType, 
  startTime, 
  watermarkText,
  isCustomFullscreen,
  onFullscreenToggle
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const syncInterval = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const { isSynced, now } = useServerTime();

  // Active Security Obfuscation Listeners
  useEffect(() => {
    const handleSecurityViolation = () => {
      setIsBlocked(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      // Capture standard shortcuts (PrtScn, Ctrl+P, Ctrl+S, CMD+Shift+3/4/5, CMD+Alt+I)
      if (
        e.key === 'PrintScreen' || 
        (e.ctrlKey && e.key === 'p') || 
        (e.ctrlKey && e.key === 's') ||
        (isMac && e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'))
      ) {
        e.preventDefault();
        handleSecurityViolation();
        alert("Screenshot & screen recording is not allowed for security reasons.");
      }
    };

    const handleFocusLoss = () => {
      // Blur can indicate taking a screenshot or window capture tool opening
      setIsBlocked(true);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('blur', handleFocusLoss);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleSecurityViolation();
      }
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('blur', handleFocusLoss);
    };
  }, []);

  const handleWrapperClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.player-control-btn')) return;

    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullscreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        try {
          const doc = document as any;
          if (doc.exitFullscreen) {
            doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            doc.webkitExitFullscreen();
          } else if (doc.msExitFullscreen) {
            doc.msExitFullscreen();
          }
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    if (onFullscreenToggle) {
      onFullscreenToggle();
      return;
    }

    if (!containerRef.current) return;

    if (!isFullscreen) {
      const elem = containerRef.current as any;
      try {
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen(); // Safari
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen(); // IE11
        }
      } catch (err) {
        console.warn("Fullscreen request failed, relying on virtual layout", err);
      }
      setIsFullscreen(true);
    } else {
      try {
        const doc = document as any;
        if (doc.exitFullscreen) {
          doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      } catch (err) {
        console.warn("Exit fullscreen failed:", err);
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    if (videoSourceType === 'embed') {
      return;
    }

    if (!videoRef.current || !isSynced) return;
    const video = videoRef.current;
    let hls: Hls | null = null;
    
    // Determine type
    const isHlsUrl = url.includes('.m3u8') || videoSourceType === 'hls';

    const setupSync = () => {
      const enforceSync = () => {
        const currentNow = now();
        const start = new Date(startTime).getTime();
        const elapsedSeconds = (currentNow - start) / 1000;
        
        if (elapsedSeconds > 0) {
          const currentTime = video.currentTime || 0;
          const drift = Math.abs(currentTime - elapsedSeconds);
          
          if (drift > 3 || video.paused) {
             video.currentTime = elapsedSeconds;
             video.play().catch(e => console.log('Autoplay blocked:', e));
          }
        }
      };

      enforceSync();
      syncInterval.current = setInterval(enforceSync, 2000);
    };

    if (isHlsUrl) {
      if (Hls.isSupported()) {
        hls = new Hls({
            startPosition: -1, 
            capLevelToPlayerSize: true, 
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
           setupSync();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari fallback natively
        video.src = url;
        video.addEventListener('loadedmetadata', setupSync);
      }
    } else {
      // Standard MP4
      video.src = url;
      video.addEventListener('loadedmetadata', setupSync);
    }

    // Force play on pause
    const onPause = () => {
       const currentNow = now();
       const start = new Date(startTime).getTime();
       const elapsedSeconds = (currentNow - start) / 1000;
       if (elapsedSeconds > 0) {
           video.play().catch(e => console.log('Autoplay blocked on pause:', e));
       }
    };
    video.addEventListener('pause', onPause);

    return () => {
      if (syncInterval.current) clearInterval(syncInterval.current);
      video.removeEventListener('loadedmetadata', setupSync);
      video.removeEventListener('pause', onPause);
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, videoSourceType, startTime, isSynced, now]);

  const toggleMute = () => {
      if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
          setIsMuted(videoRef.current.muted);
          if (!videoRef.current.muted && videoRef.current.paused) {
              videoRef.current.play().catch(console.error);
          }
      }
  };

  const activeFullscreenState = isCustomFullscreen !== undefined ? isCustomFullscreen : isFullscreen;

  return (
    <div
      ref={containerRef}
      onClick={handleWrapperClick}
      className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden transition-all duration-300 group cursor-pointer ${
        activeFullscreenState ? 'fixed inset-0 w-screen h-screen z-[9999] bg-black' : ''
      }`}
    >
      {videoSourceType === 'embed' ? (
        <div 
          className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover pointer-events-auto"
          dangerouslySetInnerHTML={{ __html: url }}
        />
      ) : (
        <div className="w-full h-full pointer-events-none">
          <video
            ref={videoRef}
            className="w-full h-full object-contain pointer-events-auto"
            playsInline
            autoPlay
            muted
            controls={false}
          />
          
          {/* Unmute Overlay */}
          {isMuted && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity pointer-events-auto cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                toggleMute();
                setShowControls(true);
                if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
             }}>
                <div className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-6 py-3 flex items-center gap-3 backdrop-blur-md transition-all shadow-2xl scale-100 hover:scale-105 active:scale-95">
                    <VolumeX className="w-6 h-6 text-white" />
                    <span className="text-white font-medium tracking-wide">Click to Unmute</span>
                </div>
             </div>
          )}
        </div>
      )}

      {/* Controls Overlay container */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none flex flex-col justify-between z-[60]"
          >
            {/* Top Bar */}
            <div className="p-4 sm:p-6 w-full flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent">
              {activeFullscreenState && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                  className="player-control-btn pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/80 text-white border border-white/20 rounded-lg text-xs sm:text-sm font-medium backdrop-blur-md transition-all active:scale-95 shadow-lg"
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-400" />
                  <span>Exit Fullscreen</span>
                </button>
              )}
            </div>

            {/* Bottom Bar */}
            <div className="p-4 sm:p-6 w-full flex items-end justify-end bg-gradient-to-t from-black/60 to-transparent gap-3 pointer-events-auto">
              {/* Mute toggle button */}
              {videoSourceType !== 'embed' && !isMuted && (
                  <button 
                      onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                      className="player-control-btn bg-black/60 hover:bg-black/90 border border-white/20 rounded-full p-3 backdrop-blur-md transition-all text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95"
                  >
                      <Volume2 className="w-5 h-5" />
                  </button>
              )}
              
              {/* Fullscreen button */}
              <button 
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="player-control-btn bg-black/60 hover:bg-black/90 border border-white/20 rounded-full p-3 backdrop-blur-md transition-all text-white shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-95"
              >
                  {activeFullscreenState ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Block interactions */}
      <div className={`absolute inset-0 z-40 bg-transparent ${videoSourceType === 'embed' ? 'pointer-events-auto' : 'pointer-events-none'}`} onClick={(e) => {
         if (videoSourceType === 'embed') {
             e.preventDefault();
             e.stopPropagation();
         }
      }} />

      {/* Screen block / Capture warning screen protection overlay */}
      {isBlocked && (
        <div 
          className="absolute inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-md space-y-5">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <span className="text-2xl font-bold">🔒</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider mb-2">Security Shield Active</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                Screenshot & screen recording is not allowed for security reasons. Video, audio feed and content have been blacked out.
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsBlocked(false);
              }}
              className="player-control-btn px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] cursor-pointer"
            >
              Resume Live stream Feed safely
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
