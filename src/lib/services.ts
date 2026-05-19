import { collection, doc, setDoc, getDocs, query, where, deleteDoc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Session, Registration, LiveAttendance } from '../types';

export const sessionService = {
  async createSession(data: Omit<Session, 'id' | 'createdAt'>): Promise<Session> {
    const sessionsRef = collection(db, 'sessions');
    const docRef = await addDoc(sessionsRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, ...data, createdAt: new Date().toISOString() };
  },

  async getAdminSessions(adminId: string): Promise<Session[]> {
    const q = query(collection(db, 'sessions'), where('adminId', '==', adminId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
  },

  async updateSession(sessionId: string, data: Partial<Session>): Promise<void> {
    const docRef = doc(db, 'sessions', sessionId);
    await updateDoc(docRef, data);
  },

  async deleteSession(sessionId: string): Promise<void> {
    await deleteDoc(doc(db, 'sessions', sessionId));
  },
  
  async getSessionById(sessionId: string): Promise<Session | null> {
    const docRef = doc(db, 'sessions', sessionId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as Session;
  }
};

export const registrationService = {
  async register(data: Omit<Registration, 'id' | 'registeredAt' | 'joinToken'>): Promise<Registration> {
    const joinToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const regRef = collection(db, 'registrations');
    const newReg = {
      ...data,
      joinToken,
      registeredAt: new Date().toISOString()
    };
    const docRef = await addDoc(regRef, newReg);
    return { id: docRef.id, ...newReg };
  },

  async getSessionRegistrations(sessionId: string): Promise<Registration[]> {
    const q = query(collection(db, 'registrations'), where('sessionId', '==', sessionId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
  },
  
  async getRegistrationByToken(joinToken: string): Promise<Registration | null> {
     const q = query(collection(db, 'registrations'), where('joinToken', '==', joinToken));
     const snapshot = await getDocs(q);
     if (snapshot.empty) return null;
     return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Registration;
  }
};
