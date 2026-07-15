import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { sessionService, registrationService } from '../lib/services';
import { Session, Registration } from '../types';
import { 
  Plus, Settings, Users, Link as LinkIcon, Trash2, Calendar, Clock, Video, LogOut, 
  Upload, X, FileVideo, CheckCircle2, MessageSquare, Heart, Eye, Sliders, Shield, 
  Zap, Check, ShieldAlert, RefreshCw, PlayCircle, Send, Lock, Copy, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { uploadVideoToApiVideo } from '../lib/apivideo';
import ThemeToggle from '../components/ThemeToggle';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';

function AMPMDateTimePicker({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  let dateStr = '';
  let timeStr = '';

  if (value && value.includes('T')) {
    const parts = value.split('T');
    dateStr = parts[0];
    timeStr = parts[1];
  } else {
    const now = new Date();
    dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
    timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  const [hs, ms] = timeStr.split(':');
  let h24 = parseInt(hs || '0', 10);
  let m = parseInt(ms || '0', 10);

  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12 || 12;

  const update = (newDate: string, newH12: number, newM: number, newAmpm: string) => {
    let outH = newH12;
    if (newAmpm === 'PM' && outH < 12) outH += 12;
    if (newAmpm === 'AM' && outH === 12) outH = 0;
    const outTime = `${outH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    onChange(`${newDate}T${outTime}`);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 items-stretch w-full">
      <div className="w-full lg:w-[45%] shrink-0">
        <input 
          type="date"
          required
          value={dateStr}
          onChange={(e) => update(e.target.value, h12, m, ampm)}
          className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors text-sm font-medium"
        />
      </div>
      <div className="flex gap-2 w-full lg:w-[55%] items-stretch min-w-0">
        <select 
          value={h12}
          onChange={(e) => update(dateStr, parseInt(e.target.value), m, ampm)}
          className="flex-[1_1_0%] min-w-0 bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-1 sm:px-2 py-3 focus:outline-none focus:border-purple-500 transition-colors text-sm text-center appearance-none cursor-pointer font-medium"
        >
          {[...Array(12)].map((_, i) => (
            <option key={i+1} value={i+1}>{i+1}</option>
          ))}
        </select>
        <div className="flex shrink-0 items-center justify-center text-white/40 dark:text-white/40 light:text-slate-400 font-bold">
          :
        </div>
        <select 
          value={m}
          onChange={(e) => update(dateStr, h12, parseInt(e.target.value), ampm)}
          className="flex-[1_1_0%] min-w-0 bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-1 sm:px-2 py-3 focus:outline-none focus:border-purple-500 transition-colors text-sm text-center appearance-none cursor-pointer font-medium"
        >
          {Array.from({length: 60}, (_, i) => (
            <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
          ))}
        </select>
        <select 
          value={ampm}
          onChange={(e) => update(dateStr, h12, m, e.target.value)}
          className="shrink-0 w-[4.5rem] bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-1 py-3 focus:outline-none focus:border-purple-500 transition-colors text-sm text-center appearance-none cursor-pointer font-bold tracking-wide"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const [newSession, setNewSession] = useState<{
    title: string;
    description: string;
    playbackUrl: string;
    videoSourceType: 'upload' | 'embed' | 'hls';
    startTime: string;
    durationMinutes: number;
  }>({
    title: '',
    description: '',
    playbackUrl: '',
    videoSourceType: 'upload',
    startTime: '',
    durationMinutes: 60,
  });

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const navigate = useNavigate();

  const [isEditingSession, setIsEditingSession] = useState(false);
  const [editingSessionData, setEditingSessionData] = useState<{
    startTime: string;
    durationMinutes: number;
    playbackUrl: string;
    videoSourceType: 'upload' | 'embed' | 'hls';
  }>({
    startTime: '',
    durationMinutes: 60,
    playbackUrl: '',
    videoSourceType: 'upload',
  });

  // Dynamic Dashboard Tab selection
  const [dashboardTab, setDashboardTab] = useState<'attendees' | 'live'>('attendees');

  // New Live Session Creator Controls config states
  const [newChatEnabled, setNewChatEnabled] = useState(true);
  const [newAutoChatEnabled, setNewAutoChatEnabled] = useState(true);
  const [newAiReplyEnabled, setNewAiReplyEnabled] = useState(true);
  const [newTargetViewers, setNewTargetViewers] = useState(150);
  const [newTargetLikes, setNewTargetLikes] = useState(45);
  const [newChatSpeed, setNewChatSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

  // Dynamic Session Editor Controls config states
  const [editChatEnabled, setEditChatEnabled] = useState(true);
  const [editAutoChatEnabled, setEditAutoChatEnabled] = useState(true);
  const [editAiReplyEnabled, setEditAiReplyEnabled] = useState(true);
  const [editTargetViewers, setEditTargetViewers] = useState(150);
  const [editTargetLikes, setEditTargetLikes] = useState(45);
  const [editChatSpeed, setEditChatSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

  // Real-time Chat details
  const [liveChats, setLiveChats] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'real' | 'auto'>('all');

  // Firestore real-time active metrics synchronizer
  useEffect(() => {
    if (!selectedSession) return;
    
    // Subscribe to live session document changes to pull realtime viewers/likes
    const unsubSession = onSnapshot(doc(db, 'sessions', selectedSession.id), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSelectedSession(prev => prev ? { ...prev, ...data } as Session : null);
      }
    }, (err) => {
      console.error("Dashboard session snapshot sync error:", err);
    });

    return () => unsubSession();
  }, [selectedSession?.id]);

  // Firestore real-time chats subcollection synchronizer
  useEffect(() => {
    if (!selectedSession || dashboardTab !== 'live') {
      setLiveChats([]);
      return;
    }

    const chatsRef = collection(db, 'sessions', selectedSession.id, 'chats');
    const q = query(chatsRef, orderBy('createdAt', 'asc'));
    const unsubChats = onSnapshot(q, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({ ...docSnap.data(), id: docSnap.id });
      });
      setLiveChats(messages);
    }, (err) => {
      console.error("Dashboard chats snapshot sync error:", err);
    });

    return () => unsubChats();
  }, [selectedSession?.id, dashboardTab]);

  // Duration Pickers State (Create Form)
  const [newHours, setNewHours] = useState(1);
  const [newMinutes, setNewMinutes] = useState(0);
  const [newSeconds, setNewSeconds] = useState(0);

  // Duration Pickers State (Edit Form)
  const [editHours, setEditHours] = useState(1);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editSeconds, setEditSeconds] = useState(0);

  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [copiedAttendeeToken, setCopiedAttendeeToken] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn("Navigator clipboard failed, trying execCommand fallback:", err);
    }
    
    // Fallback
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("execCommand fallback failed:", err);
      return false;
    }
  };

  // Sync Duration states for Create Form
  useEffect(() => {
    const mins = newHours * 60 + newMinutes + newSeconds / 60;
    setNewSession(prev => ({ ...prev, durationMinutes: mins }));
  }, [newHours, newMinutes, newSeconds]);

  // Sync Duration states for Edit Form
  useEffect(() => {
    const mins = editHours * 60 + editMinutes + editSeconds / 60;
    setEditingSessionData(prev => ({ ...prev, durationMinutes: mins }));
  }, [editHours, editMinutes, editSeconds]);

  // Populate Edit form values when a session is selected
  useEffect(() => {
    if (isEditingSession && selectedSession) {
      const totalMins = selectedSession.durationMinutes;
      setEditHours(Math.floor(totalMins / 60));
      setEditMinutes(Math.floor(totalMins % 60));
      setEditSeconds(Math.round((totalMins * 60) % 60));
    }
  }, [isEditingSession, selectedSession]);

  const handleUpdateSession = async () => {
    if (!selectedSession) return;
    try {
      const updatedFields = {
        startTime: editingSessionData.startTime,
        startTimeMs: new Date(editingSessionData.startTime).getTime(),
        durationMinutes: editingSessionData.durationMinutes,
        playbackUrl: editingSessionData.playbackUrl,
        videoSourceType: editingSessionData.videoSourceType,
        chatEnabled: editChatEnabled,
        autoChatEnabled: editAutoChatEnabled,
        aiReplyEnabled: editAiReplyEnabled,
        targetViewers: editTargetViewers,
        targetLikes: editTargetLikes,
        chatSpeed: editChatSpeed
      };
      await sessionService.updateSession(selectedSession.id, updatedFields);
      setSelectedSession({
        ...selectedSession,
        ...updatedFields
      });
      setIsEditingSession(false);
      loadSessions();
    } catch (err) {
      console.error(err);
      alert('Failed to update session');
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this session? This will remove all associated attendee data.")) return;
    
    try {
      await sessionService.deleteSession(sessionId);
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete session');
    }
  };

  const handleDeleteRegistration = async (registrationId: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) return;
    
    // Fallback/optimistic filter
    setRegistrations(prev => prev.filter(r => r.id !== registrationId));
    
    try {
      await registrationService.deleteRegistration(registrationId);
    } catch (err) {
      console.error('Error deleting registration:', err);
      alert('Failed to remove attendee');
      // Rollback on failure
      if (selectedSession) {
        loadRegistrations(selectedSession.id);
      }
    }
  };

  // Real-time live settings modifiers
  const toggleLiveSetting = async (field: string, currentVal: boolean) => {
    if (!selectedSession) return;
    try {
      const docRef = doc(db, 'sessions', selectedSession.id);
      await updateDoc(docRef, { [field]: !currentVal });
    } catch (err) {
      console.error(`Error toggling live configs ${field}:`, err);
    }
  };

  const updateNumericSetting = async (field: string, newVal: number) => {
    if (!selectedSession) return;
    try {
      const docRef = doc(db, 'sessions', selectedSession.id);
      await updateDoc(docRef, { [field]: newVal });
    } catch (err) {
      console.error(`Error updating live targets ${field}:`, err);
    }
  };

  const updateSpeedSetting = async (newSpeed: string) => {
    if (!selectedSession) return;
    try {
      const docRef = doc(db, 'sessions', selectedSession.id);
      await updateDoc(docRef, { chatSpeed: newSpeed });
    } catch (err) {
      console.error("Error updating chat generation speed limits:", err);
    }
  };

  const handleAdminSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !chatInput.trim()) return;

    try {
      const chatsRef = collection(db, 'sessions', selectedSession.id, 'chats');
      await addDoc(chatsRef, {
        name: "🎤 Host (Trainer Ma'am)",
        text: chatInput,
        createdAt: Date.now(),
        type: 'admin',
        isAdmin: true,
        avatarColor: 'purple'
      });
      setChatInput('');
    } catch (err) {
      console.error("Failed executing trainer reply post:", err);
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/mp4')) {
      setSubmitError('Please upload an MP4 video file.');
      return;
    }
    
    setSubmitError(null);
    setUploadState('uploading');
    setUploadProgress(0);

    try {
      const result = await uploadVideoToApiVideo(file, (progress) => {
        setUploadProgress(progress);
      });
      
      const computedMins = Math.ceil((result.duration || 3600) / 60);
      setNewSession(prev => ({
        ...prev,
        playbackUrl: result.videoUrl,
        durationMinutes: computedMins
      }));

      // Automatically prefill duration fields based on uploaded video length
      setNewHours(Math.floor(computedMins / 60));
      setNewMinutes(Math.floor(computedMins % 60));
      setNewSeconds(0);
      
      setUploadState('success');
    } catch (err: any) {
      console.error(err);
      setUploadState('error');
      setSubmitError(err.message || 'Failed to upload video');
    }
  };

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    const data = await sessionService.getAdminSessions(user.uid);
    setSessions(data);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitError(null);
    setSubmitSuccess(false);

    if (!newSession.title.trim()) {
      setSubmitError('Title is required');
      return;
    }

    if (!newSession.playbackUrl.trim()) {
      setSubmitError('Please upload a valid training video first.');
      return;
    }

    if (!newSession.startTime) {
      setSubmitError('Start time is required');
      return;
    }

    if (newSession.durationMinutes < 0.1) {
      setSubmitError('Duration must be at least 10 seconds');
      return;
    }

    setIsSubmitting(true);

    try {
      await sessionService.createSession({
        ...newSession,
        startTimeMs: new Date(newSession.startTime).getTime(),
        adminId: user.uid,
        isActive: true,
        chatEnabled: newChatEnabled,
        autoChatEnabled: newAutoChatEnabled,
        aiReplyEnabled: newAiReplyEnabled,
        targetViewers: newTargetViewers,
        targetLikes: newTargetLikes,
        chatSpeed: newChatSpeed,
        currentViewers: newTargetViewers,
        currentLikes: newTargetLikes
      });
      
      setSubmitSuccess(true);
      setNewSession({ title: '', description: '', playbackUrl: '', startTime: '', durationMinutes: 60 });
      setNewHours(1);
      setNewMinutes(0);
      setNewSeconds(0);
      setUploadState('idle');
      loadSessions();

      setTimeout(() => {
        setIsCreating(false);
        setSubmitSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error("Creation failed:", err);
      setSubmitError(err.message || 'Failed to create session. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadRegistrations = async (sessionId: string) => {
    const data = await registrationService.getSessionRegistrations(sessionId);
    setRegistrations(data);
  };

  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
    loadRegistrations(session.id);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 dark:text-slate-100 light:text-slate-800 flex flex-col font-sans overflow-x-hidden relative transition-colors duration-300">
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 dark:bg-purple-600/20 light:bg-purple-400/20 blur-[120px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 dark:bg-blue-600/20 light:bg-blue-400/20 blur-[120px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-green-500/15 dark:bg-green-500/15 light:bg-green-400/20 blur-[100px] rounded-full mix-blend-screen light:mix-blend-multiply"></div>
      </div>

      <header className="relative z-10 border-b border-white/10 dark:border-white/10 light:border-slate-200 bg-black/30 dark:bg-black/30 light:bg-white backdrop-blur-md sticky top-0 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <img 
                src="https://res.cloudinary.com/dtpktdkqw/image/upload/v1779785300/d91bc495-04ad-4214-ad23-5abdd9bf370d_gzmzqt.jpg" 
                alt="Mushroom Training Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white/90 dark:text-white/90 light:text-slate-900 drop-shadow-sm light:drop-shadow-none">
                Organic Mushroom<span className="text-[#a8b8d0] light:text-slate-500"> Farm</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-white/50 dark:text-white/50 light:text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <ThemeToggle />
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Session</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 light:text-slate-500 light:hover:text-slate-800 light:hover:bg-slate-200/50 transition-all duration-200 active:scale-95 cursor-pointer"
              title="Sign Out"
            >
               <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Sidebar Pane */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold mb-4 sm:mb-6 flex items-center space-x-2 text-white dark:text-white light:text-slate-900">
            <Video className="w-5 h-5 text-purple-400" />
            <span>Your Sessions</span>
          </h2>
          
          <div className="space-y-4">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => handleViewSession(session)}
                className={`p-5 rounded-2xl transition-all cursor-pointer border shadow-md active:scale-[0.98] ${
                  selectedSession?.id === session.id
                    ? 'bg-purple-950/20 dark:bg-purple-950/20 border-purple-500/40 light:bg-purple-50 Light:border-purple-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] ring-1 ring-blue-500/30'
                    : 'bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 light:bg-white light:border-slate-200 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-100'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-white dark:text-white light:text-slate-900 line-clamp-2 pr-2">{session.title}</h3>
                  <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${session.isActive ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.8)] animate-pulse' : 'bg-red-500'}`} />
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1.5 rounded-lg text-white/30 dark:text-white/30 light:text-slate-400 hover:text-red-400 light:hover:text-red-600 hover:bg-red-400/10 dark:hover:bg-red-400/10 light:hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs sm:text-sm text-white/50 dark:text-white/50 light:text-slate-500 space-y-2 font-medium">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>{new Date(session.startTime).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>
                      {session.durationMinutes >= 60 ? `${Math.floor(session.durationMinutes / 60)}h ` : ''}
                      {Math.floor(session.durationMinutes % 60)}m 
                      {Math.round((session.durationMinutes * 60) % 60) > 0 ? ` ${Math.round((session.durationMinutes * 60) % 60)}s` : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center py-12 text-white/40 dark:text-white/40 light:text-slate-400 border border-dashed border-white/10 dark:border-white/10 light:border-slate-200 rounded-2xl bg-white/[0.01]">
                No sessions yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Active Panel Details */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedSession ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-black/20 dark:bg-black/20 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl relative transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-6 sm:mb-8 gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white dark:text-white light:text-slate-900">{selectedSession.title}</h2>
                    <p className="text-white/60 dark:text-white/60 light:text-slate-500 text-sm">{selectedSession.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        navigate(`/admin/live/${selectedSession.id}`);
                      }}
                      className="p-2.5 bg-red-600/10 hover:bg-red-600 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-500/30 rounded-xl text-red-400 hover:text-white transition-all shadow-md cursor-pointer text-xs sm:text-sm font-bold flex items-center gap-1.5 animate-pulse shrink-0"
                    >
                      <PlayCircle className="w-4.5 h-4.5 shrink-0" />
                      <span>Live Monitor</span>
                    </button>
                    <button 
                      onClick={() => {
                        setEditingSessionData({
                          startTime: selectedSession.startTime,
                          durationMinutes: selectedSession.durationMinutes,
                          playbackUrl: selectedSession.playbackUrl,
                          videoSourceType: selectedSession.videoSourceType || 'upload'
                        });
                        setIsEditingSession(true);
                      }}
                      className="p-2.5 bg-white/5 border border-white/10 dark:bg-white/5 dark:border-white/10 light:bg-slate-100 light:border-slate-200 rounded-xl transition-all shadow-md text-white/70 dark:text-white/70 light:text-slate-600 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200 cursor-pointer text-sm font-medium flex items-center shrink-0"
                    >
                      <Settings className="w-5 h-5 mr-1" />
                      <span className="hidden sm:inline">Settings</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 dark:bg-white/5 border border-white/5 dark:border-white/5 light:bg-slate-50 light:border-slate-200 p-4 rounded-xl shadow-sm">
                    <div className="text-xs sm:text-sm text-white/50 dark:text-white/50 light:text-slate-500 mb-2">Registration Link</div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}/register/${selectedSession.id}`}
                        className="bg-black/40 dark:bg-black/40 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm flex-1 font-mono text-white/80 dark:text-white/80 light:text-slate-700 focus:outline-none"
                      />
                      <a 
                        href={`${window.location.origin}/register/${selectedSession.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg transition shadow-md font-semibold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                        title="Open Registration Link in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Link</span>
                      </a>
                    </div>
                  </div>
                  <div className="bg-white/5 dark:bg-white/5 border border-white/5 dark:border-white/5 light:bg-slate-50 light:border-slate-200 p-4 rounded-xl flex flex-col justify-center shadow-sm">
                    <div className="text-xs sm:text-sm text-white/50 dark:text-white/50 light:text-slate-500 mb-1">Total Registrations</div>
                    <div className="text-2xl font-light text-white dark:text-white light:text-slate-900">{registrations.length}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-white dark:text-white light:text-slate-900">
                    <Users className="w-5 h-5 text-blue-400" />
                    <span>Registered Attendees</span>
                  </h3>
                  
                  {/* Table Wrap for Horizontal Scroll On Mobile */}
                  <div className="bg-black/40 dark:bg-black/40 light:bg-white border border-white/10 dark:border-white/10 light:border-slate-200 rounded-2xl overflow-hidden shadow-lg select-none">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left text-xs sm:text-sm min-w-[550px] sm:min-w-0">
                        <thead className="border-b border-white/5 dark:border-b-white/5 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 text-white dark:text-white light:text-slate-800">
                          <tr>
                            <th className="px-4 sm:px-6 py-4 font-semibold text-white/70 dark:text-white/70 light:text-slate-700">Name</th>
                            <th className="px-4 sm:px-6 py-4 font-semibold text-white/70 dark:text-white/70 light:text-slate-700">Email</th>
                            <th className="px-4 sm:px-6 py-4 font-semibold text-white/70 dark:text-white/70 light:text-slate-700">Registered</th>
                            <th className="px-4 sm:px-6 py-4 font-semibold text-white/70 dark:text-white/70 light:text-slate-700">Join Link</th>
                            <th className="px-4 sm:px-6 py-4 font-semibold text-white/70 dark:text-white/70 light:text-slate-700 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 dark:divide-white/5 light:divide-slate-200/60">
                          {registrations.map(reg => (
                            <tr key={reg.id} className="hover:bg-white/[0.02] dark:hover:bg-white/[0.02] light:hover:bg-slate-50/50 transition-colors text-white dark:text-white light:text-slate-800">
                              <td className="px-4 sm:px-6 py-4 font-medium">{reg.name}</td>
                              <td className="px-4 sm:px-6 py-4 text-white/60 dark:text-white/60 light:text-slate-600 font-mono">{reg.email}</td>
                              <td className="px-4 sm:px-6 py-4 text-white/50 dark:text-white/50 light:text-slate-500">{new Date(reg.registeredAt).toLocaleDateString()}</td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex items-center space-x-2">
                                  <span className="text-zinc-500 dark:text-zinc-500 light:text-slate-400 font-mono text-[11px] truncate max-w-[150px] sm:max-w-[200px]" title={`${window.location.host}/live/${reg.joinToken}`}>
                                    {`${window.location.host}/live/${reg.joinToken}`}
                                  </span>
                                  <a 
                                    href={`${window.location.origin}/live/${reg.joinToken}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 bg-indigo-600/10 dark:bg-indigo-600/10 light:bg-slate-100 hover:bg-indigo-650 hover:text-white dark:hover:bg-indigo-650 dark:hover:text-white light:hover:bg-indigo-600 light:hover:text-white border border-indigo-500/20 rounded-lg transition text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                                    title="Open live session link in a new tab"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Open Link</span>
                                  </a>
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-right">
                                <button
                                  onClick={() => handleDeleteRegistration(reg.id)}
                                  className="text-red-400 hover:text-red-500 light:text-red-500 light:hover:text-red-600 p-2 hover:bg-red-400/10 dark:hover:bg-red-400/10 light:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer shadow-sm"
                                  title="Kick/Remove Attendee"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {registrations.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-white/40 dark:text-white/40 light:text-slate-400">
                                No registered attendees yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[350px] flex items-center justify-center border border-dashed border-white/10 dark:border-white/10 light:border-slate-200 rounded-3xl"
              >
                <div className="text-center text-white/40 dark:text-white/40 light:text-slate-400">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50 text-indigo-400" />
                  <p className="font-medium text-sm sm:text-base">Select a session to view details</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* CREATE SESSION MODAL */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/60 border border-white/10 dark:bg-black/60 dark:border-white/10 light:bg-white light:border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl relative transition-all duration-300 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-white dark:text-white light:text-slate-900">Create New Session</h2>
            
            {submitError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm whitespace-pre-wrap">
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 dark:text-green-400 text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Session created successfully!
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newSession.title}
                  onChange={e => setNewSession({...newSession, title: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="e.g. Masterclass: Advanced Trading"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Description</label>
                <textarea
                  required
                  value={newSession.description}
                  onChange={e => setNewSession({...newSession, description: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors h-20 sm:h-24"
                  placeholder="Summarize the core topics covered in this training webinar..."
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 dark:text-white/60 light:text-slate-600 mb-2">Video Source Type</label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setNewSession(prev => ({ ...prev, videoSourceType: 'upload', playbackUrl: '' }))}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      newSession.videoSourceType === 'upload' ? 'bg-indigo-500 text-white' : 'bg-white/5 dark:bg-white/5 light:bg-slate-100 text-white/60 dark:text-white/60 light:text-slate-600 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200'
                    }`}
                  >
                    Direct Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSession(prev => ({ ...prev, videoSourceType: 'embed', playbackUrl: '' }))}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      newSession.videoSourceType === 'embed' ? 'bg-indigo-500 text-white' : 'bg-white/5 dark:bg-white/5 light:bg-slate-100 text-white/60 dark:text-white/60 light:text-slate-600 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200'
                    }`}
                  >
                    Embed Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSession(prev => ({ ...prev, videoSourceType: 'hls', playbackUrl: '' }))}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      newSession.videoSourceType === 'hls' ? 'bg-indigo-500 text-white' : 'bg-white/5 dark:bg-white/5 light:bg-slate-100 text-white/60 dark:text-white/60 light:text-slate-600 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200'
                    }`}
                  >
                    HLS .m3u8 URL
                  </button>
                </div>
                
                {newSession.videoSourceType === 'upload' && (
                  <div className="space-y-2">
                    {uploadState === 'idle' || uploadState === 'error' ? (
                       <div className="relative border-2 border-dashed border-white/20 hover:border-indigo-500/50 light:border-slate-300 light:hover:border-indigo-500/50 rounded-2xl p-6 sm:p-8 transition-colors flex flex-col items-center justify-center text-center cursor-pointer bg-white/5 dark:bg-white/5 light:bg-slate-50">
                          <input 
                            type="file" 
                            accept="video/mp4"
                            onChange={handleVideoSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mb-3">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="font-semibold text-sm sm:text-base mb-1 text-white dark:text-white light:text-slate-800">Click or drag MP4 video here</p>
                          <p className="text-[10px] sm:text-xs text-white/40 dark:text-white/40 light:text-slate-500">Maximum file size: 500MB</p>
                       </div>
                    ) : uploadState === 'uploading' ? (
                       <div className="border border-white/10 dark:border-white/10 light:border-slate-200 rounded-2xl p-6 bg-white/5 dark:bg-white/5 light:bg-slate-50">
                          <div className="flex items-center justify-between mb-4 gap-2">
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                                <FileVideo className="w-5 h-5" />
                              </div>
                              <div className="overflow-hidden">
                                <div className="text-sm font-medium text-white dark:text-white light:text-slate-800 truncate">Uploading to api.video...</div>
                                <div className="text-xs text-white/50 dark:text-white/50 light:text-slate-500">{uploadProgress}% Complete</div>
                              </div>
                            </div>
                            <div className="text-sm font-mono font-bold text-indigo-400 shrink-0">{uploadProgress}%</div>
                          </div>
                          <div className="h-2 w-full bg-black/40 dark:bg-black/40 light:bg-slate-200 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadProgress}%` }}
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            />
                          </div>
                       </div>
                    ) : (
                       <div className="border border-green-500/30 dark:border-green-500/30 light:border-green-300 rounded-2xl p-5 bg-green-500/10 dark:bg-green-500/10 light:bg-green-50/50 flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />
                            <div className="overflow-hidden">
                              <div className="text-sm font-medium text-green-100 dark:text-green-100 light:text-green-900">Video Uploaded Successfully</div>
                              <div className="text-xs text-green-400/70 font-mono truncate max-w-[200px]" title={newSession.playbackUrl}>
                                {newSession.playbackUrl}
                              </div>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setUploadState('idle');
                              setNewSession(prev => ({...prev, playbackUrl: '', durationMinutes: 60}));
                            }}
                            className="p-2 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200 rounded-full text-white/60 dark:text-white/60 light:text-slate-500 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                       </div>
                    )}
                  </div>
                )}

                {newSession.videoSourceType === 'embed' && (
                  <div>
                    <label className="block text-xs text-white/50 dark:text-white/50 light:text-slate-600 mb-1">HTML Embed Code (iframe)</label>
                    <textarea
                      required
                      value={newSession.playbackUrl}
                      onChange={e => setNewSession({...newSession, playbackUrl: e.target.value})}
                      placeholder='<iframe src="https://www.youtube.com/embed/..." ...></iframe>'
                      className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors h-20 sm:h-24 font-mono text-xs sm:text-sm"
                    />
                  </div>
                )}

                {newSession.videoSourceType === 'hls' && (
                  <div>
                    <label className="block text-xs text-white/50 dark:text-white/50 light:text-slate-600 mb-1">HLS Playlist URL (.m3u8)</label>
                    <input
                      type="url"
                      required
                      value={newSession.playbackUrl}
                      onChange={e => setNewSession({...newSession, playbackUrl: e.target.value})}
                      placeholder="https://example.com/stream.m3u8"
                      className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
                <div className="md:col-span-7 lg:col-span-7">
                  <label className="block text-sm text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Start Time (Local)</label>
                  <AMPMDateTimePicker 
                    value={newSession.startTime}
                    onChange={(val) => setNewSession({...newSession, startTime: val})}
                  />
                </div>
                
                {/* Hours, Minutes, Seconds Picker for CREATE */}
                <div className="md:col-span-5 lg:col-span-5">
                  <label className="block text-sm text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[9px] text-white/40 dark:text-white/40 light:text-slate-500 uppercase tracking-widest text-center mb-0.5">Hours</span>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={newHours}
                        onChange={e => setNewHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-2 py-2 text-center text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] text-white/40 dark:text-white/40 light:text-slate-500 uppercase tracking-widest text-center mb-0.5">Minutes</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={newMinutes}
                        onChange={e => setNewMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-2 py-2 text-center text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] text-white/40 dark:text-white/40 light:text-slate-500 uppercase tracking-widest text-center mb-0.5">Seconds</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={newSeconds}
                        onChange={e => setNewSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-2 py-2 text-center text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-white/40 dark:text-white/40 light:text-slate-500 mt-1.5 text-right font-mono">
                    ({newSession.durationMinutes.toFixed(2)} mins)
                  </div>
                </div>
              </div>

              {/* Live Assistant & Broadcaster Targets Configuration */}
              <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] dark:border-white/10 dark:bg-white/[0.02] light:bg-slate-50 light:border-slate-300 mt-5 space-y-4 shadow-inner">
                <h3 className="text-xs font-bold text-white/80 dark:text-white/80 light:text-slate-800 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  Live Broadcaster Controls & Autopilot Simulator
                </h3>
                
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-indigo-500/30 dark:bg-black/40 dark:border-white/5 cursor-pointer text-center select-none transition-colors">
                    <span className="text-[9px] text-white/50 mb-1.5 font-bold tracking-wide uppercase">Real Chat</span>
                    <input 
                      type="checkbox" 
                      checked={newChatEnabled} 
                      onChange={e => setNewChatEnabled(e.target.checked)} 
                      className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 bg-black/30"
                    />
                    <span className="text-[9px] text-indigo-400 mt-1.5 font-extrabold uppercase">{newChatEnabled ? 'On' : 'Off'}</span>
                  </label>
                  
                  <label className="flex flex-col items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-purple-500/30 dark:bg-black/40 dark:border-white/5 cursor-pointer text-center select-none transition-colors">
                    <span className="text-[9px] text-white/50 mb-1.5 font-bold tracking-wide uppercase">Auto Chat</span>
                    <input 
                      type="checkbox" 
                      checked={newAutoChatEnabled} 
                      onChange={e => setNewAutoChatEnabled(e.target.checked)} 
                      className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 bg-black/30"
                    />
                    <span className="text-[9px] text-purple-400 mt-1.5 font-extrabold uppercase">{newAutoChatEnabled ? 'On' : 'Off'}</span>
                  </label>
                  
                  <label className="flex flex-col items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-500/30 dark:bg-black/40 dark:border-white/5 cursor-pointer text-center select-none transition-colors">
                    <span className="text-[9px] text-white/50 mb-1.5 font-bold tracking-wide uppercase">AI Reply</span>
                    <input 
                      type="checkbox" 
                      checked={newAiReplyEnabled} 
                      onChange={e => setNewAiReplyEnabled(e.target.checked)} 
                      className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 bg-black/30"
                    />
                    <span className="text-[9px] text-emerald-400 mt-1.5 font-extrabold uppercase">{newAiReplyEnabled ? 'On' : 'Off'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Target Viewers</label>
                    <input 
                      type="number" 
                      min="5" 
                      max="5000" 
                      value={newTargetViewers} 
                      onChange={e => setNewTargetViewers(Math.max(5, parseInt(e.target.value) || 0))} 
                      className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-white light:border-slate-300 light:text-slate-900 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Target Likes</label>
                    <input 
                      type="number" 
                      min="5" 
                      max="10000" 
                      value={newTargetLikes} 
                      onChange={e => setNewTargetLikes(Math.max(5, parseInt(e.target.value) || 0))} 
                      className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-white light:border-slate-300 light:text-slate-900 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/60 dark:text-white/60 light:text-slate-600 mb-1.5">Chat Flow Speed</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['slow', 'medium', 'fast'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewChatSpeed(s as any)}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer border ${
                          newChatSpeed === s 
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-extrabold' 
                            : 'bg-black/30 dark:bg-black/30 light:bg-slate-100 text-white/40 dark:text-white/40 light:text-slate-500 border-white/5 dark:border-white/5 light:border-slate-200 hover:bg-black/50 hover:text-white/60'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-5 py-3 rounded-xl font-medium hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-100 light:text-slate-700 transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || submitSuccess}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : submitSuccess ? (
                     <span>Created!</span>
                  ) : (
                    <span>Create Session</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT SESSION DETAILS MODAL */}
      {isEditingSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/60 border border-white/10 dark:bg-black/60 dark:border-white/10 light:bg-white light:border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-xl shadow-2xl relative transition-all duration-300 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-white dark:text-white light:text-slate-900">Edit Session Details</h2>
            
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateSession(); }} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 dark:text-white/60 light:text-slate-600 mb-2">Video Source Type</label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setEditingSessionData(prev => ({ ...prev, videoSourceType: 'upload', playbackUrl: '' }))}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      editingSessionData.videoSourceType === 'upload' ? 'bg-indigo-500 text-white' : 'bg-white/5 dark:bg-white/5 light:bg-slate-100 text-white/60 dark:text-white/60 light:text-slate-600 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200'
                    }`}
                  >
                    Direct Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSessionData(prev => ({ ...prev, videoSourceType: 'embed', playbackUrl: '' }))}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      editingSessionData.videoSourceType === 'embed' ? 'bg-indigo-500 text-white' : 'bg-white/5 dark:bg-white/5 light:bg-slate-100 text-white/60 dark:text-white/60 light:text-slate-600 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200'
                    }`}
                  >
                    Embed Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSessionData(prev => ({ ...prev, videoSourceType: 'hls', playbackUrl: '' }))}
                    className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      editingSessionData.videoSourceType === 'hls' ? 'bg-indigo-500 text-white' : 'bg-white/5 dark:bg-white/5 light:bg-slate-100 text-white/60 dark:text-white/60 light:text-slate-600 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-slate-200'
                    }`}
                  >
                    HLS .m3u8 URL
                  </button>
                </div>
                
                {editingSessionData.videoSourceType === 'upload' && (
                  <div className="space-y-3">
                    <div className="border border-indigo-500/20 dark:border-indigo-500/20 light:border-slate-300 bg-indigo-500/5 dark:bg-indigo-500/5 light:bg-slate-50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center shrink-0">
                          <FileVideo className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-sm font-semibold text-white dark:text-white light:text-slate-800 truncate">Linked Video Asset</div>
                          <div className="text-xs text-green-400 dark:text-green-400 light:text-green-600 font-medium flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Active & Streamable
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ready to broadcast
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-white/50 dark:text-white/50 light:text-slate-600 mb-1">Video Resource Location (Read-only)</label>
                      <input
                        type="text"
                        disabled
                        value={editingSessionData.playbackUrl}
                        className="w-full bg-black/45 border border-white/10 dark:bg-black/45 dark:border-white/10 light:bg-slate-100 light:border-slate-200 light:text-slate-600 rounded-xl px-4 py-3 opacity-70 font-mono text-xs truncate"
                      />
                    </div>
                    
                    <p className="text-xs text-amber-500 dark:text-amber-400 light:text-amber-700 bg-amber-500/10 dark:bg-amber-500/10 light:bg-amber-50 border border-amber-500/20 rounded-xl p-3 leading-relaxed">
                      💡 <strong>Important Note:</strong> To change your uploaded video, please create a new session instead of editing. This ensures correct transcode pipelines, resolution renditions, and HLS segments are updated in the cloud databases.
                    </p>
                  </div>
                )}

                {editingSessionData.videoSourceType === 'embed' && (
                  <div>
                    <label className="block text-xs text-white/50 dark:text-white/50 light:text-slate-600 mb-1">HTML Embed Code (iframe)</label>
                    <textarea
                      required
                      value={editingSessionData.playbackUrl}
                      onChange={e => setEditingSessionData({...editingSessionData, playbackUrl: e.target.value})}
                      placeholder='<iframe src="https://www.youtube.com/embed/..." ...></iframe>'
                      className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors h-20 sm:h-24 font-mono text-xs sm:text-sm"
                    />
                  </div>
                )}

                {editingSessionData.videoSourceType === 'hls' && (
                  <div>
                    <label className="block text-xs text-white/50 dark:text-white/50 light:text-slate-600 mb-1">HLS Playlist URL (.m3u8)</label>
                    <input
                      type="url"
                      required
                      value={editingSessionData.playbackUrl}
                      onChange={e => setEditingSessionData({...editingSessionData, playbackUrl: e.target.value})}
                      placeholder="https://example.com/stream.m3u8"
                      className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
                <div className="md:col-span-7 lg:col-span-7">
                  <label className="block text-sm text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Start Time (Local)</label>
                  <AMPMDateTimePicker 
                    value={editingSessionData.startTime}
                    onChange={(val) => setEditingSessionData({...editingSessionData, startTime: val})}
                  />
                </div>
                
                {/* Hours, Minutes, Seconds Picker for EDIT */}
                <div className="md:col-span-5 lg:col-span-5">
                  <label className="block text-sm text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[9px] text-white/40 dark:text-white/40 light:text-slate-500 uppercase tracking-widest text-center mb-0.5">Hours</span>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        value={editHours}
                        onChange={e => setEditHours(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-2 py-2 text-center text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] text-white/40 dark:text-white/40 light:text-slate-500 uppercase tracking-widest text-center mb-0.5">Minutes</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={editMinutes}
                        onChange={e => setEditMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-2 py-2 text-center text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-[9px] text-white/40 dark:text-white/40 light:text-slate-500 uppercase tracking-widest text-center mb-0.5">Seconds</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={editSeconds}
                        onChange={e => setEditSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-slate-50 light:border-slate-300 light:text-slate-950 rounded-xl px-2 py-2 text-center text-xs sm:text-sm focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-white/40 dark:text-white/40 light:text-slate-500 mt-1.5 text-right font-mono">
                    ({editingSessionData.durationMinutes.toFixed(2)} mins)
                  </div>
                </div>
              </div>

              {/* Edit Engagement configurations */}
              <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] dark:border-white/10 dark:bg-white/[0.02] light:bg-slate-50 light:border-slate-300 mt-5 space-y-4 shadow-inner">
                <h3 className="text-xs font-bold text-white/80 dark:text-white/80 light:text-slate-800 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  Live Controls & Engagement Configurations
                </h3>
                
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex flex-col items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-indigo-500/30 dark:bg-black/40 dark:border-white/5 cursor-pointer text-center select-none transition-colors">
                    <span className="text-[9px] text-white/50 mb-1.5 font-bold tracking-wide uppercase">Real Chat</span>
                    <input 
                      type="checkbox" 
                      checked={editChatEnabled} 
                      onChange={e => setEditChatEnabled(e.target.checked)} 
                      className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 bg-black/30"
                    />
                    <span className="text-[9px] text-indigo-400 mt-1.5 font-extrabold uppercase">{editChatEnabled ? 'On' : 'Off'}</span>
                  </label>
                  
                  <label className="flex flex-col items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-purple-500/30 dark:bg-black/40 dark:border-white/5 cursor-pointer text-center select-none transition-colors">
                    <span className="text-[9px] text-white/50 mb-1.5 font-bold tracking-wide uppercase">Auto Chat</span>
                    <input 
                      type="checkbox" 
                      checked={editAutoChatEnabled} 
                      onChange={e => setEditAutoChatEnabled(e.target.checked)} 
                      className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 bg-black/30"
                    />
                    <span className="text-[9px] text-purple-400 mt-1.5 font-extrabold uppercase">{editAutoChatEnabled ? 'On' : 'Off'}</span>
                  </label>
                  
                  <label className="flex flex-col items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-500/30 dark:bg-black/40 dark:border-white/5 cursor-pointer text-center select-none transition-colors">
                    <span className="text-[9px] text-white/50 mb-1.5 font-bold tracking-wide uppercase">AI Reply</span>
                    <input 
                      type="checkbox" 
                      checked={editAiReplyEnabled} 
                      onChange={e => setEditAiReplyEnabled(e.target.checked)} 
                      className="w-4 h-4 rounded border-white/10 text-indigo-600 focus:ring-indigo-500 bg-black/30"
                    />
                    <span className="text-[9px] text-emerald-400 mt-1.5 font-extrabold uppercase">{editAiReplyEnabled ? 'On' : 'Off'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Target Viewers</label>
                    <input 
                      type="number" 
                      min="5" 
                      max="5000" 
                      value={editTargetViewers} 
                      onChange={e => setEditTargetViewers(Math.max(5, parseInt(e.target.value) || 0))} 
                      className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-white light:border-slate-300 light:text-slate-900 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 dark:text-white/60 light:text-slate-600 mb-1">Target Likes</label>
                    <input 
                      type="number" 
                      min="5" 
                      max="10000" 
                      value={editTargetLikes} 
                      onChange={e => setEditTargetLikes(Math.max(5, parseInt(e.target.value) || 0))} 
                      className="w-full bg-black/50 border border-white/10 dark:bg-black/50 dark:border-white/10 light:bg-white light:border-slate-300 light:text-slate-900 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/60 dark:text-white/60 light:text-slate-600 mb-1.5">Chat Flow Speed</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['slow', 'medium', 'fast'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditChatSpeed(s as any)}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer border ${
                          editChatSpeed === s 
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-extrabold' 
                            : 'bg-black/30 dark:bg-black/30 light:bg-slate-100 text-white/40 dark:text-white/40 light:text-slate-500 border-white/5 dark:border-white/5 light:border-slate-200 hover:bg-black/50 hover:text-white/60'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsEditingSession(false)}
                  className="px-5 py-3 rounded-xl font-medium hover:bg-white/5 dark:hover:bg-white/5 light:hover:bg-slate-100 light:text-slate-700 transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center gap-2 cursor-pointer text-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
