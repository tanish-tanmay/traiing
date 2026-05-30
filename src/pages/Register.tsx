import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionService, registrationService } from '../lib/services';
import { Session, Registration } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Register() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState<Registration | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: ''
  });

  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId]);

  const loadSession = async (id: string) => {
    try {
      const data = await sessionService.getSessionById(id);
      setSession(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !sessionId) return;
    
    setRegistering(true);
    try {
      const reg = await registrationService.register({
        sessionId,
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile
      });
      setSuccess(reg);
    } catch (e) {
      console.error(e);
      alert('Failed to register');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 flex flex-col items-center justify-center text-slate-100 dark:text-slate-100 light:text-slate-900 transition-colors duration-300">
        <div className="w-10 h-10 border-4 border-transparent border-t-indigo-500 rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 flex items-center justify-center text-red-500 font-medium transition-colors duration-300">
        Session not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] dark:bg-[#0a0a0a] light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-800 flex relative overflow-hidden transition-colors duration-300 w-full">
      {/* Floating Theme Toggle in Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="fixed inset-0 pointer-events-none z-[-1] bg-[#030305] dark:bg-[#030305] light:bg-[#f1f5f9] transition-colors duration-500">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 dark:bg-purple-600/20 light:bg-purple-400/20 blur-[120px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 dark:bg-blue-600/20 light:bg-blue-400/20 blur-[120px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-green-500/15 dark:bg-green-500/15 light:bg-green-400/20 blur-[100px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
      </div>

      <div className="flex-1 hidden lg:block relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black/80 to-transparent z-0 dark:opacity-100 light:opacity-20" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30 z-0 dark:opacity-30 light:opacity-10" />
        <div className="relative z-10 p-20 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-lg">
                <img 
                  src="https://res.cloudinary.com/dtpktdkqw/image/upload/v1779785300/d91bc495-04ad-4214-ad23-5abdd9bf370d_gzmzqt.jpg" 
                  alt="Mushroom Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">
                Organic Mushroom<span className="text-[#a8b8d0]"> Farm</span>
              </span>
            </div>

            <div className="inline-block px-4 py-2 border border-white/20 dark:border-white/20 light:border-slate-350/70 rounded-full text-sm font-semibold tracking-widest uppercase mb-8 backdrop-blur-md bg-white/5 dark:bg-white/5 light:bg-white/40 light:text-slate-700">
              Live Masterclass
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold font-serif leading-[1.15] mb-6 text-white dark:text-white light:text-slate-900">
              {session.title}
            </h1>
            <p className="text-lg lg:text-xl text-white/70 dark:text-white/70 light:text-slate-600 max-w-xl leading-relaxed">
              {session.description}
            </p>
          </div>
          
          <div className="flex items-center space-x-12">
            <div className="flex flex-col">
              <span className="text-white/50 dark:text-white/50 light:text-slate-400 text-xs sm:text-sm uppercase tracking-wider mb-2 font-semibold">When</span>
              <div className="flex items-center space-x-2 text-lg sm:text-xl font-semibold text-white dark:text-white light:text-slate-850">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 dark:text-purple-400 light:text-purple-600" />
                <span>{new Date(session.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-white/50 dark:text-white/50 light:text-slate-400 text-xs sm:text-sm uppercase tracking-wider mb-2 font-semibold">Time</span>
              <div className="flex items-center space-x-2 text-lg sm:text-xl font-semibold text-white dark:text-white light:text-slate-850">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 dark:text-blue-400 light:text-blue-600" />
                <span>{new Date(session.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10 bg-transparent">
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-black/60 border border-white/10 dark:bg-black/60 dark:border-white/10 light:bg-white/80 light:border-white/60 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] light:shadow-[0_8px_32px_0_rgba(100,100,120,0.15)] transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/10 light:from-white/40 pointer-events-none rounded-3xl"></div>
              
              <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6 lg:hidden">
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-lg">
                  <img 
                    src="https://res.cloudinary.com/dtpktdkqw/image/upload/v1779785300/d91bc495-04ad-4214-ad23-5abdd9bf370d_gzmzqt.jpg" 
                    alt="Mushroom Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-base font-bold tracking-tight text-white dark:text-white light:text-slate-900 drop-shadow-sm light:drop-shadow-none">
                  Organic Mushroom<span className="text-[#a8b8d0] light:text-slate-500"> Farm</span>
                </span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-white dark:text-white light:text-slate-900">Reserve Your Seat</h2>
              <p className="text-white/50 dark:text-white/50 light:text-slate-500 text-sm sm:text-base mb-8">Fill in your details below to save your spot.</p>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-white/50 dark:text-white/50 light:text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 px-4 py-3 focus:outline-none focus:border-indigo-400/60 transition-all rounded-xl text-lg text-white dark:text-white light:bg-white light:border-slate-300 light:text-slate-900 light:placeholder-slate-400 shadow-inner focus:ring-2 focus:ring-indigo-400/20"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 dark:text-white/50 light:text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 px-4 py-3 focus:outline-none focus:border-indigo-400/60 transition-all rounded-xl text-lg text-white dark:text-white light:bg-white light:border-slate-300 light:text-slate-900 light:placeholder-slate-400 shadow-inner focus:ring-2 focus:ring-indigo-400/20"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 dark:text-white/50 light:text-slate-500 uppercase tracking-widest mb-2">Mobile Number</label>
                  <div className="flex w-full bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:border-indigo-400/60 focus-within:ring-2 focus-within:ring-indigo-400/20 transition-all light:bg-white light:border-slate-300 shadow-inner">
                    <span className="px-3 sm:px-4 py-3 text-lg text-white/50 dark:text-white/50 light:text-slate-500 bg-black/30 dark:bg-black/30 light:bg-slate-50 border-r border-white/5 dark:border-white/5 light:border-slate-200 font-medium">+91</span>
                    <input
                      type="tel"
                      required
                      value={formData.mobile}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({...formData, mobile: val});
                      }}
                      className="w-full bg-transparent px-4 py-3 focus:outline-none text-lg text-inherit tracking-wider light:placeholder-slate-450 dark:text-white light:text-slate-950"
                      placeholder="98765 43210"
                      pattern="[0-9]{10}"
                      title="10 digit Indian mobile number"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={registering}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white py-4 rounded-xl font-bold text-lg transition-all active:scale-95 border border-white/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] mt-8 disabled:opacity-50 cursor-pointer shadow-lg"
                >
                  <span className="drop-shadow-md">{registering ? 'Securing Spot...' : 'Secure My Spot'}</span>
                  {!registering && <ArrowRight className="w-5 h-5 drop-shadow-md" />}
                </button>
              </form>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg bg-black/60 border border-white/10 dark:bg-black/60 dark:border-white/10 light:bg-white light:border-slate-200 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-300 relative overflow-hidden text-left z-10"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-green-400 via-indigo-500 to-purple-500 z-20"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-500/25 dark:bg-green-500/25 light:bg-green-100 text-green-400 light:text-green-600 rounded-full flex items-center justify-center shrink-0 border border-green-500/30">
                    <CheckCircle2 className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-green-400 dark:text-green-400 light:text-green-600 tracking-wider uppercase">Successful!</span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white dark:text-white light:text-slate-900 leading-tight">Registration Successfully Completed</h2>
                  </div>
                </div>

                <p className="text-sm text-white/60 dark:text-white/60 light:text-slate-500 leading-relaxed border-b border-white/15 dark:border-b-white/15 light:border-slate-100 pb-3">
                  Thank you for completing your registration. Below are your login credentials for accessing the live session. Please save them carefully.
                </p>

                {/* Credentials Display */}
                <div className="space-y-3 bg-black/40 dark:bg-black/40 light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200/80 p-4 rounded-2xl">
                  <div className="flex items-center justify-between text-xs sm:text-sm py-2 border-b border-white/5 dark:border-white/5 light:border-slate-200/50">
                    <span className="text-white/40 dark:text-white/40 light:text-slate-500 font-medium">Name:</span>
                    <span className="text-white dark:text-white light:text-slate-800 font-bold">{success.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm py-2 border-b border-white/5 dark:border-white/5 light:border-slate-200/50">
                    <span className="text-white/40 dark:text-white/40 light:text-slate-500 font-medium font-sans">Access ID:</span>
                    <span className="text-indigo-400 dark:text-indigo-400 light:text-indigo-600 font-mono font-bold tracking-wider select-all">{success.studentId}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm py-2 border-b border-white/5 dark:border-white/5 light:border-slate-200/50">
                    <span className="text-white/40 dark:text-white/40 light:text-slate-500 font-medium">Password:</span>
                    <span className="text-purple-400 dark:text-purple-400 light:text-pink-600 font-mono font-bold tracking-wider select-all">{success.password}</span>
                  </div>
                  <div className="flex flex-col space-y-1.5 py-2">
                    <span className="text-white/40 dark:text-white/40 light:text-slate-500 text-xs sm:text-sm font-medium">Live Join Link:</span>
                    <div className="bg-black/60 dark:bg-black/60 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 p-2.5 rounded-xl font-mono text-[10px] sm:text-xs text-white/80 dark:text-white/80 light:text-slate-800 break-all select-all shadow-inner">
                      {`${window.location.origin}/live/${success.joinToken}`}
                    </div>
                  </div>
                </div>

                {/* Email Notice */}
                <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/10 light:bg-indigo-50/70 border border-indigo-500/20 rounded-xl text-center">
                  <p className="text-xs sm:text-sm text-indigo-300 dark:text-indigo-300 light:text-indigo-700 font-medium">
                    📧 An automated email containing registration details and your secret password has been successfully sent to <span className="font-bold underline text-white dark:text-white light:text-slate-900">{success.email}</span>.
                  </p>
                </div>

                {/* Waiting room submit button */}
                <button
                  onClick={() => navigate(`/live/${success.joinToken}`)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-base transition-all active:scale-95 cursor-pointer shadow-lg border border-white/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center space-x-2"
                >
                  <span className="drop-shadow-md">Go to Waiting & Login Room</span>
                  <ArrowRight className="w-5 h-5 drop-shadow-md" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
