import { motion } from 'framer-motion';
import { Sprout, CheckCircle2, Sparkles, BookOpen, Globe, MessageCircle } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function Completion() {
  return (
    <div className="min-h-screen bg-[#030305] dark:bg-[#030305] light:bg-[#f1f5f9] text-slate-100 dark:text-slate-100 light:text-slate-800 flex flex-col justify-center items-center relative overflow-hidden px-4 transition-colors duration-500 w-full">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 dark:bg-purple-600/20 light:bg-purple-400/20 blur-[120px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 dark:bg-blue-600/20 light:bg-blue-400/20 blur-[120px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-green-500/15 dark:bg-green-500/15 light:bg-green-400/20 blur-[100px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
      </div>

      {/* Floating Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Content Container */}
      <div className="max-w-xl w-full text-center relative z-10">
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 dark:text-green-400 light:text-green-600 text-[11px] font-bold tracking-wider uppercase mb-8 shadow-sm"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Program Finished</span>
        </motion.div>

        {/* Logo Icon / Card Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-6 shadow-xl border border-white/10 dark:border-white/10 light:border-slate-200"
        >
          <img 
            src="https://res.cloudinary.com/dtpktdkqw/image/upload/v1779785300/d91bc495-04ad-4214-ad23-5abdd9bf370d_gzmzqt.jpg" 
            alt="Mushroom logo" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* Completion Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-black/40 border border-white/10 dark:bg-black/40 dark:border-white/10 light:bg-white/60 light:border-white/50 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] light:shadow-[0_8px_32px_0_rgba(100,100,120,0.15)] relative overflow-hidden transition-all duration-300 z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/10 light:from-white/40 pointer-events-none rounded-3xl"></div>
          {/* Subtle Top Gradient Bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-green-500 z-20"></div>
          
          <div className="relative z-10 pt-8 sm:pt-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white dark:text-white light:text-slate-900 mb-6 font-serif leading-tight">
            Thank You for Joining
          </h1>

          <div className="space-y-4 mb-8 text-white/90 dark:text-white/90 light:text-slate-800 text-sm sm:text-base leading-relaxed text-center font-medium">
            <p className="font-bold text-indigo-200 dark:text-indigo-200 light:text-indigo-800 drop-shadow-md light:drop-shadow-none">
              Thank you for attending the Mushroom Cultivation Program.
            </p>
            <p className="text-white/90 dark:text-white/90 light:text-slate-800">
              Your mushroom farming journey has now started.
            </p>
            <p className="font-bold text-white dark:text-white light:text-slate-950 mb-4 drop-shadow-md light:drop-shadow-none">
              Keep learning, keep growing, and turn your knowledge into a successful Mushroom Farming Business.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
               <a 
                 href="https://organicmushroomfarm.shop" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="w-full sm:w-auto relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] border border-white/20 active:scale-95 text-center flex items-center justify-center gap-2 backdrop-blur-md"
               >
                 <Globe className="w-4 h-4 drop-shadow-md" />
                 <span className="drop-shadow-md text-white font-bold">Visit Website</span>
               </a>
               
               <a 
                 href="https://wa.me/919203544140" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="w-full sm:w-auto relative overflow-hidden bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] border border-white/20 active:scale-95 text-center flex items-center justify-center gap-2 backdrop-blur-md"
               >
                 <MessageCircle className="w-4 h-4 drop-shadow-md" />
                 <span className="drop-shadow-md text-white font-bold">WhatsApp Support</span>
               </a>
            </div>
          </div>

          {/* Inline Deco Row */}
          <div className="flex items-center justify-center gap-6 text-white/90 dark:text-white/90 light:text-slate-800 border-t border-white/20 dark:border-white/20 light:border-slate-300 pt-6 mt-6 font-bold">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Sprout className="w-4 h-4 text-green-400 light:text-green-600" />
              <span className="drop-shadow-md light:drop-shadow-none">Plant Spores</span>
            </div>
            <div className="h-4 w-[1px] bg-white/20 dark:bg-white/20 light:bg-slate-300"></div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-amber-400 light:text-amber-600" />
              <span className="drop-shadow-md light:drop-shadow-none">Cultivate Crop</span>
            </div>
            <div className="h-4 w-[1px] bg-white/20 dark:bg-white/20 light:bg-slate-300"></div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 text-blue-400 light:text-blue-600" />
              <span className="drop-shadow-md light:drop-shadow-none">Harvest Value</span>
            </div>
          </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
