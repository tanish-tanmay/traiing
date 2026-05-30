import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] dark:bg-[#030305] light:bg-[#f1f5f9] text-slate-100 dark:text-slate-100 light:text-slate-800 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      {/* Theme Toggle Positioned Beautifully in the Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="fixed inset-0 pointer-events-none z-[0]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 dark:bg-purple-600/20 light:bg-purple-400/20 blur-[120px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 dark:bg-blue-600/20 light:bg-blue-400/20 blur-[120px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-green-500/15 dark:bg-green-500/15 light:bg-green-400/20 blur-[100px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-black/40 border border-white/10 dark:bg-black/40 dark:border-white/10 light:bg-white/60 light:border-white/50 backdrop-blur-2xl rounded-3xl p-10 relative overflow-hidden transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] light:shadow-[0_8px_32px_0_rgba(100,100,120,0.15)] z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/10 light:from-white/40 pointer-events-none rounded-3xl"></div>
          <div className="relative z-10">
           <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-6 shadow-lg">
               <img 
                 src="https://res.cloudinary.com/dtpktdkqw/image/upload/v1779785300/d91bc495-04ad-4214-ad23-5abdd9bf370d_gzmzqt.jpg" 
                 alt="Mushroom Training Logo" 
                 className="w-full h-full object-cover"
                 referrerPolicy="no-referrer"
               />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white dark:text-white light:text-slate-900 mb-2 font-serif drop-shadow-sm light:drop-shadow-none">
              Organic Mushroom<span className="text-[#a8b8d0] light:text-slate-500"> Farm</span>
            </h1>
            <p className="text-white/50 dark:text-white/50 light:text-slate-500 text-sm tracking-wide uppercase">Admin Portal</p>
          </div>

          {error && (
            <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm leading-relaxed"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-white/50 dark:text-white/50 light:text-slate-600 uppercase tracking-widest mb-2">Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/20 dark:bg-black/20 border border-white/10 px-4 py-3 pl-11 focus:outline-none focus:border-indigo-400/60 transition-all rounded-xl text-sm text-white dark:text-white light:bg-white/50 light:border-white/60 light:text-slate-900 light:placeholder-slate-400 shadow-inner backdrop-blur-md focus:ring-2 focus:ring-indigo-400/20"
                  placeholder="admin@example.com"
                />
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-white/40 dark:text-white/40 light:text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 dark:text-white/50 light:text-slate-600 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/20 dark:bg-black/20 border border-white/10 px-4 py-3 pl-11 pr-11 focus:outline-none focus:border-indigo-400/60 transition-all rounded-xl text-sm text-white dark:text-white light:bg-white/50 light:border-white/60 light:text-slate-900 light:placeholder-slate-400 shadow-inner backdrop-blur-md focus:ring-2 focus:ring-indigo-400/20"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-white/40 dark:text-white/40 light:text-slate-400" />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-white/40 dark:text-white/40 light:text-slate-400 hover:text-white/80 light:hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
               type="submit"
               disabled={loading}
               className="w-full relative group overflow-hidden flex items-center justify-center space-x-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-4 px-6 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 mt-8"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -translate-x-full -skew-x-12"></div>
              {loading ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                 <LogIn className="w-5 h-5 text-white shadow-sm" />
              )}
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
