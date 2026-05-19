import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { sessionService, registrationService } from '../lib/services';
import { Session, Registration } from '../types';
import VideoPlayer from '../components/VideoPlayer';
import { motion } from 'framer-motion';
import { Users, AlertCircle } from 'lucide-react';

export default function LiveSession() {
  const { joinToken } = useParams<{ joinToken: string }>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [session, setSession] = useState<Session | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  
  const [phase, setPhase] = useState<'waiting' | 'live' | 'ended'>('waiting');
  
  // Real-time counter simulation for visual effect, anchored to a base value
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (joinToken) {
      loadData(joinToken);
    }
  }, [joinToken]);

  const loadData = async (token: string) => {
    try {
      const reg = await registrationService.getRegistrationByToken(token);
      if (!reg) {
         setError("Invalid or expired join link.");
         return;
      }
      setRegistration(reg);
      
      const sess = await sessionService.getSessionById(reg.sessionId);
      if (!sess) {
         setError("Session has been removed.");
         return;
      }
      setSession(sess);
      
      // Calculate phase
      checkPhase(sess);
      
      // Setup viewer count oscillation
      setViewerCount(Math.floor(Math.random() * 50) + 150);
      
    } catch (e) {
      setError("Failed to load session details.");
    } finally {
      setLoading(false);
    }
  };

  const checkPhase = (sess: Session) => {
    const now = new Date().getTime();
    const start = new Date(sess.startTime).getTime();
    const durationMs = sess.durationMinutes * 60 * 1000;
    const end = start + durationMs;
    
    if (now < start) {
       setPhase('waiting');
    } else if (now >= start && now <= end) {
       setPhase('live');
    } else {
       setPhase('ended');
    }
  };

  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(() => {
       checkPhase(session);
       
       // Fluctuate viewers slightly if live
       if (phase === 'live') {
         setViewerCount(prev => prev + Math.floor(Math.random() * 5) - 2);
       }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [session, phase]);

  if (loading) {
     return <div className="min-h-screen bg-black flex items-center justify-center text-white">Connecting...</div>;
  }
  
  if (error || !session || !registration) {
     return (
       <div className="min-h-screen bg-black flex items-center justify-center text-white">
         <div className="bg-[#111] p-8 rounded-3xl text-center border border-white/10 max-w-md">
           <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
           <h2 className="text-xl font-bold mb-2">Access Denied</h2>
           <p className="text-white/60">{error}</p>
         </div>
       </div>
     );
  }

  // Calculate countdown
  const now = new Date().getTime();
  const start = new Date(session.startTime).getTime();
  const diffMs = start - now;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return (
    <div className="h-screen w-screen bg-transparent text-slate-100 flex flex-col font-sans overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 h-16 border-b border-white/10 backdrop-blur-md bg-black/30 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white/90">Evergreen<span className="text-indigo-400">Live</span></h1>
          <div className="h-4 w-[1px] bg-white/20 mx-2"></div>
          {phase === 'live' && (
            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Live Session</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-6">
          {phase === 'live' && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-white/40 uppercase tracking-tighter">Current Attendees</span>
              <span className="text-sm font-mono font-bold text-indigo-300">{viewerCount} Watching</span>
            </div>
          )}
          <button onClick={() => window.close()} className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-xs font-medium transition-all">
            Leave Training
          </button>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 relative flex overflow-hidden">
        {phase === 'waiting' && (
          <div className="absolute inset-0 bg-transparent flex items-center justify-center">
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-center z-10 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl"
            >
              <div className="text-white/50 tracking-widest uppercase text-sm mb-6 font-semibold">Training starts in</div>
              <div className="flex items-center space-x-6 text-7xl font-light tabular-nums font-mono">
                {hours > 0 && <span>{hours.toString().padStart(2, '0')}:</span>}
                <span>{minutes.toString().padStart(2, '0')}</span>
                <span className="text-white/30">:</span>
                <span>{seconds.toString().padStart(2, '0')}</span>
              </div>
              <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-2xl max-w-lg mx-auto backdrop-blur-md">
                <h3 className="font-semibold mb-2">Important Notice</h3>
                <p className="text-sm text-white/60">
                   This session will begin automatically. Do not close or refresh this page.
                   Please ensure your audio is turned on.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {phase === 'live' && (
           <section className="flex-1 flex flex-col p-6 gap-4 w-full h-full">
             <div className="relative flex-1 bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/5 mx-auto w-full max-w-5xl">
               <VideoPlayer 
                 url={session.videoUrl} 
                 startTime={session.startTime} 
                 watermarkText={registration.email} 
               />
             </div>
           </section>
        )}
        
        {phase === 'ended' && (
          <div className="absolute inset-0 bg-transparent flex items-center justify-center">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl"
            >
              <h2 className="text-3xl font-bold mb-4">Training Concluded</h2>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                 Thank you for attending this session. We hope you found the material valuable.
              </p>
              <button onClick={() => window.close()} className="bg-white/10 hover:bg-white/20 transition-colors border border-white/20 px-8 py-3 rounded-xl font-medium tracking-wide">
                 Leave Room
              </button>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
