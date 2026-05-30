/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminLiveMonitor from './pages/AdminLiveMonitor';
import Register from './pages/Register';
import LiveSession from './pages/LiveSession';
import Completion from './pages/Completion';
import { useAuth } from './hooks/useAuth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050508] relative overflow-hidden">
         <div className="fixed inset-0 pointer-events-none">
           <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full animate-pulse"></div>
         </div>
         <div className="w-12 h-12 border-4 border-white/10 border-t-indigo-500 rounded-full animate-spin mb-4 relative z-10"></div>
         <p className="text-white/50 text-sm font-medium tracking-widest uppercase relative z-10">Authenticating</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/live/:sessionId"
          element={
            <ProtectedRoute>
              <AdminLiveMonitor />
            </ProtectedRoute>
          }
        />
        <Route path="/register/:sessionId" element={<Register />} />
        <Route path="/live/:joinToken" element={<LiveSession />} />
        <Route path="/complete" element={<Completion />} />
        <Route path="/live-complete" element={<Completion />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
