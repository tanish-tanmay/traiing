import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useServerTime } from '../hooks/useServerTime';

interface LiveCountdownProps {
  targetTime: string; // ISO string
  attendeeName: string;
  onZero: () => void;
}

export default function LiveCountdown({ targetTime, attendeeName, onZero }: LiveCountdownProps) {
  const { isSynced, now } = useServerTime();
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!isSynced) return;

    const targetMs = new Date(targetTime).getTime();

    const calculateTimeLeft = () => {
      const currentNow = now();
      const difference = targetMs - currentNow;

      if (difference <= 0) {
        onZero();
        return { d: 0, h: 0, m: 0, s: 0 };
      }

      return {
        d: Math.floor(difference / (1000 * 60 * 60 * 24)),
        h: Math.floor((difference / (1000 * 60 * 60)) % 24),
        m: Math.floor((difference / 1000 / 60) % 60),
        s: Math.floor((difference / 1000) % 60),
      };
    };

    // Calculate immediately
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // visibility change listener
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeLeft(calculateTimeLeft());
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [targetTime, isSynced, now, onZero]);

  if (!isSynced || !timeLeft) {
    return (
      <div className="flex-1 flex items-center justify-center">
         <div className="animate-pulse text-white/50 text-sm tracking-widest uppercase">Synchronizing Time...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative">
      <motion.div 
        key="countdown-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
        className="w-full max-w-3xl flex flex-col items-center"
      >
        <div className="mb-8 sm:mb-12 inline-flex items-center gap-3 px-4 py-2 bg-indigo-500/10 dark:bg-indigo-500/10 light:bg-indigo-50 border border-indigo-500/20 light:border-indigo-200/60 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.2)] light:shadow-sm">
           <div className="w-2 h-2 bg-indigo-400 dark:bg-indigo-400 light:bg-indigo-600 rounded-full animate-pulse" />
           <span className="text-xs font-semibold tracking-widest text-[#a8b8d0] dark:text-[#a8b8d0] light:text-[#4f5b70] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] light:drop-shadow-none">LIVE STARTS IN...</span>
        </div>

        <div className="flex justify-center gap-2 xs:gap-3 sm:gap-6 lg:gap-8 mb-10 sm:mb-16 w-full px-2">
          <TimeUnit value={timeLeft.d} label="Days" />
          <TimeUnit value={timeLeft.h} label="Hours" />
          <TimeUnit value={timeLeft.m} label="Minutes" />
          <TimeUnit value={timeLeft.s} label="Seconds" />
        </div>

        <div className="bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 light:bg-white light:border-slate-200/80 backdrop-blur-xl px-8 py-4 rounded-2xl shadow-xl flex flex-col items-center">
           <span className="text-[10px] text-white/40 dark:text-white/40 light:text-slate-500 uppercase tracking-widest font-semibold mb-1">Waiting Lobby For</span>
           <span className="text-lg font-semibold text-white/90 dark:text-white/90 light:text-slate-800 tracking-wide">{attendeeName}</span>
        </div>
      </motion.div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  // Pad with leading zero
  const displayValue = value.toString().padStart(2, '0');

  return (
    <div className="flex flex-col items-center select-none flex-1 max-w-[112px]">
      <div className="relative w-full aspect-[4/5] xs:aspect-auto xs:w-16 xs:h-24 sm:w-28 sm:h-36 bg-neutral-900 border border-white/10 dark:bg-neutral-900 dark:border-white/10 light:bg-white light:border-gray-200 rounded-xl xs:rounded-2xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)] light:shadow-[0_8px_20px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Neon Top Highlight */}
        <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent dark:via-indigo-400/50 light:via-indigo-500/30" />
        
        <AnimatePresence mode="popLayout">
           <motion.span
             key={displayValue}
             initial={{ opacity: 0, y: 15, rotateX: -45 }}
             animate={{ opacity: 1, y: 0, rotateX: 0 }}
             exit={{ opacity: 0, y: -15, rotateX: 45 }}
             transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
             className="text-2xl xs:text-3xl sm:text-6xl font-mono font-bold text-white dark:text-white light:text-slate-900 tracking-tighter"
             style={{ transformStyle: 'preserve-3d' }}
           >
             {displayValue}
           </motion.span>
        </AnimatePresence>
        
        {/* Horizontal Split Line for glassmorphism flip effect */}
        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/50 dark:bg-black/50 light:bg-gray-200 overflow-hidden">
           <div className="absolute inset-0 bg-white/5 dark:bg-white/5 light:bg-gray-50/10" />
        </div>
      </div>
      <span className="mt-2.5 xs:mt-3 sm:mt-4 text-[8px] xs:text-[10px] sm:text-[11px] text-white/50 dark:text-white/50 light:text-slate-600 uppercase tracking-widest sm:tracking-[0.2em] font-semibold">{label}</span>
    </div>
  );
}
