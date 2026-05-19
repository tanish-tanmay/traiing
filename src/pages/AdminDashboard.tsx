import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { sessionService, registrationService } from '../lib/services';
import { Session, Registration } from '../types';
import { Plus, Settings, Users, Link as LinkIcon, Trash2, Calendar, Clock, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    videoUrl: '',
    startTime: '',
    durationMinutes: 60,
  });
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

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

    await sessionService.createSession({
      ...newSession,
      adminId: user.uid,
      isActive: true,
    });
    
    setIsCreating(false);
    setNewSession({ title: '', description: '', videoUrl: '', startTime: '', durationMinutes: 60 });
    loadSessions();
  };

  const loadRegistrations = async (sessionId: string) => {
    const data = await registrationService.getSessionRegistrations(sessionId);
    setRegistrations(data);
  };

  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
    loadRegistrations(session.id);
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full"></div>
      </div>

      <header className="relative z-10 border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white/90">
              Evergreen<span className="text-indigo-400">Live</span>
            </h1>
            <p className="text-xs text-white/50">{user?.email}</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center space-x-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/90 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto max-w-7xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold mb-6 flex items-center space-x-2">
            <Video className="w-5 h-5 text-purple-400" />
            <span>Your Sessions</span>
          </h2>
          
          <div className="space-y-4">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => handleViewSession(session)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedSession?.id === session.id
                    ? 'bg-white/10 border-white/20'
                    : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold">{session.title}</h3>
                  <div className={`w-2 h-2 rounded-full ${session.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
                <div className="text-sm text-white/50 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(session.startTime).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{session.durationMinutes} mins</span>
                  </div>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center py-12 text-white/40 border border-dashed border-white/10 rounded-2xl">
                No sessions yet.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedSession ? (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
              >
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedSession.title}</h2>
                    <p className="text-white/60">{selectedSession.description}</p>
                  </div>
                  <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="text-sm text-white/50 mb-1">Registration Link</div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}/register/${selectedSession.id}`}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm flex-1 font-mono text-white/80"
                      />
                      <button 
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register/${selectedSession.id}`)}
                        className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="text-sm text-white/50 mb-1">Total Registrations</div>
                    <div className="text-2xl font-light">{registrations.length}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <span>Registered Attendees</span>
                  </h3>
                  
                  <div className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden shadow-inner">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-white/5 bg-white/5">
                        <tr>
                          <th className="px-6 py-4 font-medium text-white/60">Name</th>
                          <th className="px-6 py-4 font-medium text-white/60">Email</th>
                          <th className="px-6 py-4 font-medium text-white/60">Registered At</th>
                          <th className="px-6 py-4 font-medium text-white/60">Join Link</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {registrations.map(reg => (
                          <tr key={reg.id} className="hover:bg-white/[0.02] mt-4">
                            <td className="px-6 py-4">{reg.name}</td>
                            <td className="px-6 py-4 text-white/60">{reg.email}</td>
                            <td className="px-6 py-4 text-white/60">{new Date(reg.registeredAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/live/${reg.joinToken}`)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                Copy Link
                              </button>
                            </td>
                          </tr>
                        ))}
                        {registrations.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-white/40">No registrations yet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center border border-dashed border-white/10 rounded-3xl"
              >
                <div className="text-center text-white/40">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a session to view details</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {isCreating && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-xl shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-6">Create New Session</h2>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newSession.title}
                  onChange={e => setNewSession({...newSession, title: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="e.g. Masterclass: Advanced Trading"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Description</label>
                <textarea
                  required
                  value={newSession.description}
                  onChange={e => setNewSession({...newSession, description: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors h-24"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Cloudinary HLS Video URL (.m3u8)</label>
                <input
                  type="url"
                  required
                  value={newSession.videoUrl}
                  onChange={e => setNewSession({...newSession, videoUrl: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                  placeholder="https://res.cloudinary.com/.../video.m3u8"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-1">Start Time (Local)</label>
                  <input
                    type="datetime-local"
                    required
                    value={newSession.startTime}
                    onChange={e => setNewSession({...newSession, startTime: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newSession.durationMinutes}
                    onChange={e => setNewSession({...newSession, durationMinutes: parseInt(e.target.value)})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-3 rounded-xl font-medium hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-white/10 border border-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all shadow-lg"
                >
                  Create Session
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
