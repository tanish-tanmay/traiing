import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionService, registrationService } from '../lib/services';
import { Session, Registration } from '../types';
import VideoPlayer from '../components/VideoPlayer';
import LiveChat from '../components/LiveChat';
import LiveCountdown from '../components/LiveCountdown';
import { useServerTime } from '../hooks/useServerTime';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertCircle, Fingerprint, ThumbsUp, ArrowLeft, Lock, Loader2, Play, MessageSquare } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';

export default function LiveSession() {
  const { joinToken } = useParams<{ joinToken: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [session, setSession] = useState<Session | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [isCustomFullscreen, setIsCustomFullscreen] = useState(false);
  const [isFullscreenChatOpen, setIsFullscreenChatOpen] = useState(false);
  
  const [phase, setPhase] = useState<'waiting' | 'live' | 'ended'>('waiting');
  const [isEvicted, setIsEvicted] = useState(false);

  // Secure login state checks
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && joinToken) {
      return sessionStorage.getItem(`omf_logged_in_${joinToken}`) === 'true' ||
             localStorage.getItem(`omf_logged_in_${joinToken}`) === 'true';
    }
    return false;
  });
  const [studentIdInput, setStudentIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Natural viewer counters starting slow at 5-15 users
  const [viewerCount, setViewerCount] = useState<number>(() => {
    if (typeof window !== 'undefined' && joinToken) {
      const savedWatching = localStorage.getItem(`live_watching_current_${joinToken}`);
      if (savedWatching) return parseInt(savedWatching, 10);
    }
    return Math.floor(Math.random() * 11) + 5; // Start: 5-15 users
  });
  
  const [likeCount, setLikeCount] = useState<number>(() => {
    if (typeof window !== 'undefined' && joinToken) {
      const savedLikes = localStorage.getItem(`live_likes_current_${joinToken}`);
      if (savedLikes) return parseInt(savedLikes, 10);
    }
    return Math.floor(Math.random() * 15) + 10; // Initial likes
  });
  const [floatingLikes, setFloatingLikes] = useState<{id: number}[]>([]);
  
  const { isSynced, now } = useServerTime();

  // Seconds tracking for session viewer curve scaling
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (joinToken && isSynced) {
      loadData(joinToken);
    }
  }, [joinToken, isSynced]);

  useEffect(() => {
    if (phase !== 'live' || !isLoggedIn) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 5);
    }, 5000);
    return () => clearInterval(interval);
  }, [phase, isLoggedIn]);

  // Real-time synchronization of Session viewer counts and likes from Firestore
  useEffect(() => {
    if (!session?.id) return;

    const sessionRef = doc(db, 'sessions', session.id);
    const unsubscribeSession = onSnapshot(sessionRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Session;
        setSession(prev => prev ? { ...prev, ...data } : data);
        
        // Update shared real-time viewer and like counters instantly
        if (data.currentViewers !== undefined) {
          setViewerCount(data.currentViewers);
        }
        if (data.currentLikes !== undefined) {
          setLikeCount(data.currentLikes);
        }
      }
    }, (err) => {
      console.error("Session subscription error:", err);
    });

    return () => unsubscribeSession();
  }, [session?.id]);

  // Real-time synchronization of Registration document to block or evict students instantly
  useEffect(() => {
    if (!registration?.id) return;

    const regRef = doc(db, 'registrations', registration.id);
    const unsubscribeReg = onSnapshot(regRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Registration;
        setRegistration(prev => prev ? { ...prev, ...data } : data);
        
        if (data.status === 'blocked') {
          setIsEvicted(true);
          sessionStorage.clear();
          localStorage.clear();
        }
      } else {
        // Registration doc has been removed by moderator/admin
        setIsEvicted(true);
        sessionStorage.clear();
        localStorage.clear();
      }
    }, (err) => {
      console.error("Registration subscription error:", err);
    });

    return () => unsubscribeReg();
  }, [registration?.id]);

  // Reset fullscreen chat state when custom fullscreen mode changes
  useEffect(() => {
    setIsFullscreenChatOpen(false);
  }, [isCustomFullscreen]);

  // Fullscreen inactivity timer to auto-hide chat button
  const [isChatButtonVisible, setIsChatButtonVisible] = useState(true);

  useEffect(() => {
    if (!isCustomFullscreen) {
      setIsChatButtonVisible(true);
      return;
    }

    let hideTimeout: NodeJS.Timeout;

    const showButtonAndResetTimer = () => {
      setIsChatButtonVisible(true);
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        setIsChatButtonVisible(false);
      }, 3000);
    };

    // Initially show and start countdown
    showButtonAndResetTimer();

    const handleActivities = () => {
      showButtonAndResetTimer();
    };

    // Track mouse movement, click, touch/tap
    window.addEventListener('mousemove', handleActivities);
    window.addEventListener('click', handleActivities);
    window.addEventListener('touchstart', handleActivities);

    return () => {
      clearTimeout(hideTimeout);
      window.removeEventListener('mousemove', handleActivities);
      window.removeEventListener('click', handleActivities);
      window.removeEventListener('touchstart', handleActivities);
    };
  }, [isCustomFullscreen]);

  const handleUserLike = async () => {
    // Trigger floating heart animations instantly for tactile client-side interactivity
    const id = Date.now();
    setFloatingLikes(prev => [...prev, { id }]);
    setTimeout(() => {
      setFloatingLikes(prev => prev.filter(like => like.id !== id));
    }, 2000);

    // Haptic feedback if supported on mobile devices
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    if (!session || !registration) return;

    // Deduplicate likes to prevent double inflation
    const likeLocalStorageKey = `omf_liked_session_${session.id}`;
    if (localStorage.getItem(likeLocalStorageKey) === 'true' || registration.hasLiked) {
      return; // Silently de-duplicate while preserving visual animations
    }

    localStorage.setItem(likeLocalStorageKey, 'true');

    try {
      const sessionDocRef = doc(db, 'sessions', session.id);
      const regDocRef = doc(db, 'registrations', registration.id);

      await updateDoc(sessionDocRef, {
        currentLikes: increment(1)
      });

      await updateDoc(regDocRef, {
        hasLiked: true
      });

      setRegistration(prev => prev ? { ...prev, hasLiked: true } : null);
    } catch (err) {
      console.error("Failed to post user like event to Firestore:", err);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!registration) return;
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const currentTokenReg = await registrationService.getRegistrationByToken(joinToken || "");
      if (!currentTokenReg) {
        setLoginError("This session access link is invalid or expired.");
        setIsLoggingIn(false);
        return;
      }

      if (currentTokenReg.status === "blocked") {
        setLoginError("Your session access status is blocked. Please contact admin.");
        setIsLoggingIn(false);
        return;
      }

      const matchId = studentIdInput.trim().toUpperCase() === currentTokenReg.studentId.toUpperCase();
      const matchPass = passwordInput.trim() === currentTokenReg.password;

      if (!matchId || !matchPass) {
        setLoginError("Incorrect Access ID or Password. Please try again.");
        setIsLoggingIn(false);
        return;
      }

      // Single Device Fingerprint Lookup
      let devId = localStorage.getItem('omf_device_id');
      if (!devId) {
        devId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('omf_device_id', devId);
      }

      const registeredDeviceId = currentTokenReg.deviceId;
      if (registeredDeviceId && registeredDeviceId !== devId) {
        setLoginError("Multiple device detected. Please continue from your registered device.");
        setIsLoggingIn(false);
        return;
      }

      // First successful login on browser. Register browser fingerprint to Firestore.
      if (!registeredDeviceId) {
        await registrationService.updateRegistration(currentTokenReg.id, { deviceId: devId });
        setRegistration(prev => prev ? { ...prev, deviceId: devId } : null);
      }

      // Success Login
      sessionStorage.setItem(`omf_logged_in_${joinToken}`, 'true');
      localStorage.setItem(`omf_logged_in_${joinToken}`, 'true');
      setIsLoggedIn(true);

    } catch (err) {
      console.error(err);
      setLoginError("Authentication failed. Please check internet connection and try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (!registration) return;
    
    // Subscribe to deletion (kicked out by admin)
    const unsubscribe = registrationService.subscribeToRegistrationDeletion(registration.id, () => {
       setIsEvicted(true);
       sessionStorage.clear();
    });
    
    return () => unsubscribe();
  }, [registration]);

  // Real-time active status & watch duration tracking under Firebase
  useEffect(() => {
    if (!isLoggedIn || !registration || !registration.id) return;

    const dbRef = doc(db, 'registrations', registration.id);

    const initializeAndHeartbeat = async () => {
      try {
        const regSnap = await getDoc(dbRef);
        if (regSnap.exists()) {
          const data = regSnap.data();
          const jTime = data.joinTime || new Date().toISOString();
          await updateDoc(dbRef, {
            joinTime: jTime,
            isOnline: true,
            lastActiveAt: new Date().toISOString(),
            deviceInfo: navigator.userAgent || 'Unknown Web Device'
          });
        }
      } catch (err) {
        console.error("Failed to initialize registration presence:", err);
      }
    };

    initializeAndHeartbeat();

    const interval = setInterval(async () => {
      try {
        const regSnap = await getDoc(dbRef);
        if (regSnap.exists()) {
          const data = regSnap.data();
          const currentWatch = data.watchingTimeSeconds || 0;
          await updateDoc(dbRef, {
            isOnline: true,
            lastActiveAt: new Date().toISOString(),
            watchingTimeSeconds: currentWatch + 10
          });
        }
      } catch (err) {
        console.error("Failed to update registration heartbeat:", err);
      }
    }, 10000);

    const markOffline = () => {
      updateDoc(dbRef, { isOnline: false }).catch(() => {});
    };

    window.addEventListener('beforeunload', markOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', markOffline);
      markOffline();
    };
  }, [isLoggedIn, registration?.id]);

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
      
    } catch (e) {
      setError("Failed to load session details.");
    } finally {
      setLoading(false);
    }
  };

  const checkPhase = (sess: Session) => {
    const currentNow = now();
    const start = sess.startTimeMs || new Date(sess.startTime).getTime();
    const durationMs = sess.durationMinutes * 60 * 1000;
    const end = start + durationMs;
    
    if (currentNow < start) {
       setPhase('waiting');
    } else if (currentNow >= start && currentNow <= end) {
       setPhase('live');
    } else {
       setPhase('ended');
     }
   };
 
   useEffect(() => {
     if (!session || !isSynced) return;
     
     const interval = setInterval(() => {
        checkPhase(session);
     }, 1000);
     
     // Check visibility to instantly sync phase when tab becomes active
     const handleVisibility = () => {
        if (!document.hidden) {
           checkPhase(session);
        }
     };
     document.addEventListener("visibilitychange", handleVisibility);
     
     return () => {
       clearInterval(interval);
       document.removeEventListener("visibilitychange", handleVisibility);
     };
   }, [session, phase, isSynced, now]);
 
   useEffect(() => {
     if (phase === 'ended') {
        // Redirect to completion page immediately
        sessionStorage.clear();
        navigate('/complete', { replace: true });
     }
   }, [phase, navigate]);
 
   if (loading) {
      return (
        <div className="min-h-screen bg-black dark:bg-black light:bg-slate-50 flex flex-col items-center justify-center text-slate-100 dark:text-slate-100 light:text-slate-900 transition-colors duration-300">
          <div className="w-10 h-10 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium">Connecting...</p>
        </div>
      );
   }
   
   if (isEvicted) {
      return (
        <div className="min-h-screen bg-[#0a051b] dark:bg-[#0a051b] light:bg-slate-50 flex items-center justify-center text-slate-100 dark:text-slate-100 light:text-slate-900 relative overflow-hidden transition-colors duration-300">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-96 bg-red-900/20 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="bg-black/60 dark:bg-black/60 dark:border-white/10 light:bg-white light:border-slate-200 backdrop-blur-2xl p-10 rounded-3xl text-center border-t border-l border-white/10 border-b border-r border-black/50 shadow-2xl max-w-md relative z-10">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6 opacity-80" />
            <h2 className="text-2xl font-bold mb-3 tracking-wide text-white dark:text-white light:text-slate-900">Session Terminated</h2>
            <p className="text-white/60 dark:text-white/60 light:text-slate-500 font-medium font-sans">You have been removed from this session by the host.</p>
          </div>
        </div>
      );
   }

   // Student Secure Validation Portal Gate
   if (!isLoggedIn) {
      return (
        <div className="min-h-screen w-screen bg-[#070314] dark:bg-[#070314] light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-tr from-purple-800/15 via-indigo-800/15 to-transparent blur-[120px] rounded-full"></div>
          </div>

          <div className="w-full max-w-md bg-black/45 dark:bg-black/45 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200/80 rounded-3xl p-6 sm:p-8 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] light:shadow-xl relative z-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl overflow-hidden mx-auto shadow-md border border-white/10 mb-2">
                <img 
                  src="https://res.cloudinary.com/dtpktdkqw/image/upload/v1779785300/d91bc495-04ad-4214-ad23-5abdd9bf370d_gzmzqt.jpg" 
                  alt="Organic Mushroom Farm" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white dark:text-white light:text-slate-800 tracking-tight">Secure Attendee Login</h2>
              <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-400 light:text-slate-500 font-medium font-sans">Please authenticate using your registration details to continue.</p>
            </div>

            {loginError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-xs leading-relaxed font-sans">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] sm:text-xs font-bold text-zinc-400 dark:text-zinc-400 light:text-slate-600 uppercase tracking-widest text-left font-sans">Access ID</label>
                <input
                  type="text"
                  required
                  value={studentIdInput}
                  onChange={e => setStudentIdInput(e.target.value)}
                  placeholder="e.g. OMF14201"
                  className="w-full px-4 py-3 placeholder-zinc-600 dark:placeholder-zinc-600 light:placeholder-slate-400 bg-white/[0.03] dark:bg-white/[0.03] light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 text-white dark:text-white light:text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 text-xs sm:text-sm font-semibold tracking-wide"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] sm:text-xs font-bold text-zinc-400 dark:text-zinc-400 light:text-slate-600 uppercase tracking-widest text-left font-sans">Verification Password</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Enter 6-digit Password"
                  className="w-full px-4 py-3 placeholder-zinc-600 dark:placeholder-zinc-600 light:placeholder-slate-400 bg-white/[0.03] dark:bg-white/[0.03] light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 text-white dark:text-white light:text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/30 text-xs sm:text-sm font-semibold tracking-wide"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold tracking-wider uppercase rounded-xl transition-all duration-150 active:scale-95 active:translate-y-[2px] cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 font-sans"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Verify & Join Session</span>
                  </>
                )}
              </button>
            </form>

            {/* Support Help Desk */}
            <div className="pt-4 border-t border-white/10 dark:border-white/10 light:border-slate-100 flex flex-col items-center space-y-2 text-center font-sans">
              <span className="text-[9px] font-bold tracking-widest text-[#a8b8d0] uppercase">Help Desk / Support</span>
              <div className="flex flex-col space-y-1 text-[11px] text-zinc-300 dark:text-zinc-300 light:text-slate-600">
                <a href="mailto:support@mushroomtraining.online" className="hover:text-indigo-400 transition-colors flex items-center justify-center gap-1.5 font-semibold">
                  <span>📧</span> <span className="underline">support@mushroomtraining.online</span>
                </a>
                <a href="https://wa.me/919203544140" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors flex items-center justify-center gap-1.5 font-semibold">
                  <span>💬</span> <span className="underline">+91 9203544140</span>
                </a>
              </div>
              <span className="text-[9px] text-zinc-500 leading-normal block pt-1">
                Single Device protection active. First device used is authorized automatically.
              </span>
            </div>
          </div>
        </div>
      );
   }

   if (error || !session || !registration) {
      return (
        <div className="min-h-screen bg-[#0a051b] dark:bg-[#0a051b] light:bg-slate-50 flex items-center justify-center text-slate-100 dark:text-slate-100 light:text-slate-900 relative overflow-hidden transition-colors duration-300">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-96 bg-red-900/10 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="bg-black/40 dark:bg-black/40 dark:border-white/10 light:bg-white light:border-slate-200 backdrop-blur-xl p-8 rounded-3xl text-center border-t border-l border-white/10 border-b border-r border-black/50 shadow-2xl max-w-md relative z-10">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-white dark:text-white light:text-slate-900">Access Denied</h2>
            <p className="text-white/60 dark:text-white/60 light:text-slate-500">{error}</p>
          </div>
        </div>
      );
   }
 
   return (
    <div className="min-h-screen lg:h-screen w-screen bg-[#0a051b] dark:bg-[#0a051b] light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-800 flex flex-col font-sans overflow-x-hidden lg:overflow-hidden relative transition-colors duration-300 font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-green-600/5 blur-[120px] rounded-full dark:opacity-100 light:opacity-40"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-l from-indigo-600/10 via-purple-600/10 to-blue-600/5 blur-[120px] rounded-full dark:opacity-100 light:opacity-40"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 h-16 border-b border-white/10 dark:border-white/10 light:border-slate-200/80 backdrop-blur-md bg-black/30 dark:bg-black/30 light:bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
            <img 
              src="https://res.cloudinary.com/dtpktdkqw/image/upload/v1779785300/d91bc495-04ad-4214-ad23-5abdd9bf370d_gzmzqt.jpg" 
              alt="Mushroom Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-white/90 dark:text-white/90 light:text-slate-800 drop-shadow-sm light:drop-shadow-none">
            Organic Mushroom <span className="text-[#a8b8d0] light:text-slate-500">Farm</span>
          </h1>
          <div className="h-4 w-[1px] bg-white/20 dark:bg-white/20 light:bg-slate-200 mx-1 sm:mx-2"></div>
          {phase === 'live' && (
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.15)] shrink-0">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-green-400">Live</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 text-slate-100">
          {phase === 'live' && (
            <div className="flex items-center gap-1.5 sm:gap-3 relative">
              {/* Floating Likes Container */}
               <div className="absolute -bottom-24 left-8 pointer-events-none z-50">
                 <AnimatePresence>
                   {floatingLikes.map(like => (
                     <motion.div
                       key={like.id}
                       initial={{ opacity: 1, y: 0, scale: 0.5 }}
                       animate={{ opacity: 0, y: -100, scale: 1.5, x: (Math.random() - 0.5) * 40 }}
                       exit={{ opacity: 0 }}
                       transition={{ duration: 1.5, ease: "easeOut" }}
                       className="absolute bottom-0 text-pink-500"
                     >
                       <ThumbsUp className="w-5 h-5" fill="currentColor" strokeWidth={1} />
                     </motion.div>
                   ))}
                 </AnimatePresence>
               </div>
  
               {/* Like Counter & Button */}
               <button 
                 onClick={handleUserLike}
                 className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-500/30 hover:to-purple-500/30 dark:from-pink-600/20 dark:to-purple-600/20 light:from-pink-50 light:to-purple-50 light:border-slate-200 border border-white/5 px-2.5 sm:px-4 py-1.5 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all active:scale-95 active:translate-y-[2px] z-10 relative cursor-pointer"
               >
                 <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400 dark:text-pink-400 light:text-pink-600" fill="currentColor" strokeWidth={1.5} />
                 <span className="text-xs sm:text-sm font-mono font-bold text-white/90 dark:text-white/90 light:text-slate-800">{likeCount.toLocaleString()}</span>
               </button>
  
               <div className="flex flex-col items-end bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-white/5 dark:from-blue-900/20 dark:to-purple-900/20 light:from-indigo-50 light:to-blue-50 light:border-slate-200 px-2.5 sm:px-4 py-1.5 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                 <div className="flex items-center gap-1 sm:gap-2 flex-nowrap">
                   <div className="w-1.5 h-1.5 bg-green-400 dark:bg-green-400 light:bg-green-500 rounded-full animate-pulse"></div>
                   <span className="text-xs sm:text-sm font-mono font-bold text-white/90 dark:text-white/90 light:text-slate-800 shrink-0">
                     {viewerCount.toLocaleString()} 
                     <span className="text-[10px] text-white/50 dark:text-white/50 light:text-slate-500 uppercase tracking-widest font-sans ml-1 hidden sm:inline">Watching</span>
                   </span>
                 </div>
               </div>
             </div>
           )}
           <ThemeToggle />
           <button 
              onClick={() => {
                 sessionStorage.clear();
                 window.location.href = 'https://organicmushroomfarm.shop';
              }} 
              className="px-2.5 sm:px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 dark:text-white light:bg-slate-100 light:border-slate-200 light:hover:bg-slate-200 light:text-slate-800 rounded-xl text-[10px] sm:text-xs font-bold tracking-wide transition-all duration-200 active:scale-95 active:translate-y-[2px] cursor-pointer shadow-sm animate-pulse shrink-0"
           >
             Leave Feed
           </button>
         </div>
      </header>
 
       {/* Main Content Pane */}
       <main className="flex-1 relative flex overflow-hidden">
         <AnimatePresence mode="wait">
         {phase === 'waiting' && (
           <motion.div key="countdown" className="absolute inset-0 z-10 flex">
             <LiveCountdown 
               targetTime={session.startTime}
               attendeeName={registration.name}
               onZero={() => setPhase('live')}
             />
           </motion.div>
         )}
         </AnimatePresence>
 
         {phase === 'live' && (
            <section className="flex-1 flex flex-col lg:flex-row w-full max-w-7xl mx-auto p-3 sm:p-6 gap-5 md:h-full relative overflow-y-auto lg:overflow-hidden">
              {/* Left column: Video player and Profile details */}
              <div className={isCustomFullscreen ? "fixed inset-0 w-screen h-screen z-[150] bg-black flex flex-col justify-center items-center overflow-hidden" : "flex-1 flex flex-col gap-4 min-w-0"}>
                <div className={isCustomFullscreen ? "relative w-full h-full max-h-screen bg-black flex items-center justify-center animate-fade-in" : "relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_20px_65px_rgba(0,0,0,0.85)] border border-white/10 dark:border-white/10 light:border-slate-200/80 w-full ring-1 ring-white/5"}>
                  <VideoPlayer 
                    url={session.playbackUrl} 
                    videoSourceType={session.videoSourceType || 'upload'}
                    startTime={session.startTime} 
                    watermarkText={registration.email} 
                    isCustomFullscreen={isCustomFullscreen}
                    onFullscreenToggle={() => setIsCustomFullscreen(!isCustomFullscreen)}
                  />
                </div>

                {/* Premium 3D Glassmorphism Passport Access Card under player */}
                {!isCustomFullscreen && (
                  <div className="bg-black/20 dark:bg-black/20 dark:border-white/10 light:bg-white light:border-slate-200/80 border-t border-l border-white/10 border-b border-r border-black/50 py-3.5 px-6 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_10px_35px_rgba(0,0,0,0.4)] transition-all flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 dark:text-white/40 light:text-slate-400 uppercase tracking-widest font-bold mb-0.5 font-sans">Attendee Name</span>
                      <span className="font-extrabold text-white/90 dark:text-white/90 light:text-slate-800 tracking-wide text-xs sm:text-sm">{registration.name}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 dark:text-white/40 light:text-slate-400 uppercase tracking-widest font-bold mb-0.5 font-sans">Access ID</span>
                      <span className="font-mono text-indigo-400 font-extrabold tracking-widest text-xs sm:text-sm">{registration.studentId}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/40 dark:text-white/40 light:text-slate-400 uppercase tracking-widest font-bold mb-0.5 font-sans">Contact No.</span>
                      <span className="font-mono text-zinc-300 dark:text-zinc-300 light:text-slate-600 font-medium tracking-wide">{registration.mobile || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col border-l border-white/10 pl-4 py-0.5">
                      <span className="text-[10px] text-[#a8b8d0] uppercase tracking-widest font-bold mb-0.5 font-sans flex items-center gap-1">Support Help Desk</span>
                      <div className="flex flex-col text-[10px] sm:text-xs">
                        <a href="mailto:support@mushroomtraining.online" className="text-zinc-300 hover:text-indigo-400 transition-colors font-semibold truncate max-w-[180px]">
                          support@mushroomtraining.online
                        </a>
                        <a href="https://wa.me/919203544140" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-green-300 transition-colors font-mono font-bold">
                          WhatsApp: +91 9203544140
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: Realistic Simulator Live Chat System */}
              <AnimatePresence>
                {isCustomFullscreen && isChatButtonVisible && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.6, x: -30 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.6, x: -30 }}
                    transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFullscreenChatOpen(!isFullscreenChatOpen);
                    }}
                    className="fixed left-6 top-1/2 -translate-y-1/2 z-[220] p-3.5 bg-[#d8b4fe] hover:bg-[#c084fc] text-purple-950 dark:bg-[#a78bfa] dark:hover:bg-[#8b5cf6] dark:text-white rounded-full shadow-2xl border border-[#c084fc]/30 cursor-pointer flex items-center justify-center m-0"
                    title="Toggle Live Chat Panel"
                  >
                    <MessageSquare className="w-5 h-5 animate-pulse" />
                  </motion.button>
                )}
              </AnimatePresence>

              {(!isCustomFullscreen || isFullscreenChatOpen) && (
                <LiveChat 
                  joinToken={joinToken || ""}
                  studentName={registration.name}
                  viewerCount={viewerCount}
                  setViewerCount={setViewerCount}
                  likeCount={likeCount}
                  setLikeCount={setLikeCount}
                  handleUserLike={handleUserLike}
                  sessionId={session.id}
                  isCustomFullscreen={isCustomFullscreen}
                  onFullscreenClose={() => setIsFullscreenChatOpen(false)}
                />
              )}
            </section>
         )}
         
       </main>
     </div>
   );
 }
