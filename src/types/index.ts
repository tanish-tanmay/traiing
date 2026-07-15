export interface Session {
  id: string;
  adminId: string;
  title: string;
  description: string;
  playbackUrl: string; // HLS m3u8 or embed code or direct URL
  videoSourceType?: 'upload' | 'embed' | 'hls';
  startTime: string; // local ISO string
  startTimeMs?: number; // UTC timestamp resolving timezone bugs
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
  
  // Real-time Controls
  chatEnabled?: boolean;
  autoChatEnabled?: boolean;
  aiReplyEnabled?: boolean;
  chatSpeed?: 'slow' | 'medium' | 'fast';
  targetViewers?: number;
  targetLikes?: number;
  currentViewers?: number;
  currentLikes?: number;
}

export interface Registration {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  mobile: string;
  joinToken: string;
  registeredAt: string;
  studentId: string;
  password: string;
  deviceId?: string;
  status?: 'active' | 'blocked';
  joinTime?: string;
  isOnline?: boolean;
  watchingTimeSeconds?: number;
  deviceInfo?: string;
  lastActiveAt?: string;
}

export interface LiveAttendance {
  id: string;
  sessionId: string;
  joinToken: string;
  joinedAt: string;
  lastPingAt: string;
}
