import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionService, registrationService } from '../lib/services';
import { Session } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  
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
      setSuccess(reg.joinToken);
    } catch (e) {
      console.error(e);
      alert('Failed to register');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Loading session...</div>;
  }

  if (!session) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">Session not found.</div>;
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="flex-1 hidden lg:block relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black/80 to-transparent z-0" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30 z-0" />
        <div className="relative z-10 p-20 h-full flex flex-col justify-between">
          <div>
            <div className="inline-block px-4 py-2 border border-white/20 rounded-full text-sm font-medium tracking-widest uppercase mb-8 backdrop-blur-md bg-white/5">
              Live Masterclass
            </div>
            <h1 className="text-6xl font-bold font-serif leading-[1.1] mb-6">
              {session.title}
            </h1>
            <p className="text-xl text-white/70 max-w-xl leading-relaxed">
              {session.description}
            </p>
          </div>
          
          <div className="flex items-center space-x-12">
            <div className="flex flex-col">
              <span className="text-white/50 text-sm uppercase tracking-wider mb-2">When</span>
              <div className="flex items-center space-x-2 text-xl font-medium">
                <Calendar className="w-6 h-6 text-purple-400" />
                <span>{new Date(session.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-white/50 text-sm uppercase tracking-wider mb-2">Time</span>
              <div className="flex items-center space-x-2 text-xl font-medium">
                <Clock className="w-6 h-6 text-blue-400" />
                <span>{new Date(session.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-8 relative z-10 bg-transparent">
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl"
            >
              <h2 className="text-3xl font-bold mb-2">Reserve Your Seat</h2>
              <p className="text-white/50 mb-8">Fill in your details below to save your spot.</p>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black/50 border-b-2 border-white/10 px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors rounded-t-lg text-lg"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-black/50 border-b-2 border-white/10 px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors rounded-t-lg text-lg"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={e => setFormData({...formData, mobile: e.target.value})}
                    className="w-full bg-black/50 border-b-2 border-white/10 px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors rounded-t-lg text-lg"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={registering}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl font-bold text-lg transition-transform active:scale-95 mt-8 disabled:opacity-50"
                >
                  <span>{registering ? 'Securing Spot...' : 'Secure My Spot'}</span>
                  {!registering && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold mb-4">You're In!</h2>
              <p className="text-white/60 mb-8">
                Your seat has been reserved. Here is your unique secure join link for the session. Please do not share it.
              </p>
              
              <div className="bg-black/50 p-4 rounded-xl border border-white/10 mb-8 font-mono text-sm break-all">
                {`${window.location.origin}/live/${success}`}
              </div>
              
              <button
                onClick={() => navigate(`/live/${success}`)}
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl font-bold text-lg transition-transform active:scale-95"
              >
                Go to Waiting Room
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
