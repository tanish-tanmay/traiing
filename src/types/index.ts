export interface Session {
  id: string;
  adminId: string;
  title: string;
  description: string;
  videoUrl: string; // Cloudinary HLS m3u8
  startTime: string; // ISO string
  durationMinutes: number;
  isActive: boolean;
  createdAt: string;
}

export interface Registration {
  id: string;
  sessionId: string;
  name: string;
  email: string;
  mobile: string;
  joinToken: string;
  registeredAt: string;
}

export interface LiveAttendance {
  id: string;
  sessionId: string;
  joinToken: string;
  joinedAt: string;
  lastPingAt: string;
}
