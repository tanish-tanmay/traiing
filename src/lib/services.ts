import { collection, doc, setDoc, getDocs, query, where, deleteDoc, updateDoc, addDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Session, Registration, LiveAttendance } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  
  if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('missing or insufficient')) {
    const helpfulMessage = `Firestore Permission Denied. Please ensure your Firebase Firestore Rules on the Firebase Console allow this operation.

For test mode, you can temporarily use:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;
    console.error(helpfulMessage, error);
    throw new Error(helpfulMessage);
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const sessionService = {
  async createSession(data: Omit<Session, 'id' | 'createdAt'>): Promise<Session> {
    try {
      console.log('Creating session in Firestore with data:', data);
      const sessionsRef = collection(db, 'sessions');
      const createdAt = new Date().toISOString();
      const docRef = await addDoc(sessionsRef, {
        ...data,
        createdAt
      });
      console.log('Session successfully created with ID:', docRef.id);
      return { id: docRef.id, ...data, createdAt };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
    throw new Error('Unexpected error');
  },

  async getAdminSessions(adminId: string): Promise<Session[]> {
    try {
      const q = query(collection(db, 'sessions'), where('adminId', '==', adminId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    }
    return [];
  },

  async updateSession(sessionId: string, data: Partial<Session>): Promise<void> {
    try {
      const docRef = doc(db, 'sessions', sessionId);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    try {
      // First, get all registrations for this session to delete them
      const q = query(collection(db, 'registrations'), where('sessionId', '==', sessionId));
      const snapshot = await getDocs(q);
      
      // Delete all registrations associated with the session
      const deletePromises = snapshot.docs.map(registrationDoc => 
        deleteDoc(doc(db, 'registrations', registrationDoc.id))
      );
      await Promise.all(deletePromises);

      // Delete the session itself
      await deleteDoc(doc(db, 'sessions', sessionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${sessionId}`);
    }
  },
  
  async getSessionById(sessionId: string): Promise<Session | null> {
    try {
      const docRef = doc(db, 'sessions', sessionId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() } as Session;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `sessions/${sessionId}`);
    }
    return null;
  }
};

export const registrationService = {
  async register(data: Omit<Registration, 'id' | 'registeredAt' | 'joinToken' | 'studentId' | 'password' | 'deviceId' | 'status'> & { studentId?: string, password?: string }): Promise<Registration> {
    try {
      const joinToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Generate OMFxxxxx studentId
      const studentId = data.studentId || `OMF${Math.floor(10000 + Math.random() * 90000)}`;
      
      // Generate secure 6-character uppercase password
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let password = data.password || "";
      if (!password) {
        for (let i = 0; i < 6; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }

      const regRef = collection(db, 'registrations');
      const newReg = {
        ...data,
        joinToken,
        studentId,
        password,
        status: 'active',
        deviceId: '',
        registeredAt: new Date().toISOString()
      };
      const docRef = await addDoc(regRef, newReg);
      return { id: docRef.id, ...newReg } as Registration;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'registrations');
      throw error;
    }
  },

  async getSessionRegistrations(sessionId: string): Promise<Registration[]> {
    try {
      const q = query(collection(db, 'registrations'), where('sessionId', '==', sessionId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'registrations');
    }
    return [];
  },
  
  async getRegistrationByToken(joinToken: string): Promise<Registration | null> {
     try {
       const q = query(collection(db, 'registrations'), where('joinToken', '==', joinToken));
       const snapshot = await getDocs(q);
       if (snapshot.empty) return null;
       return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Registration;
     } catch (error) {
       handleFirestoreError(error, OperationType.GET, 'registrations by token');
     }
     return null;
  },

  async updateRegistration(registrationId: string, data: Partial<Registration>): Promise<void> {
    try {
      const docRef = doc(db, 'registrations', registrationId);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${registrationId}`);
    }
  },

  async updateStatus(registrationId: string, status: 'active' | 'blocked'): Promise<void> {
    await this.updateRegistration(registrationId, { status });
  },

  async resetDevice(registrationId: string): Promise<void> {
    await this.updateRegistration(registrationId, { deviceId: '' });
  },

  async resetPassword(registrationId: string): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let newPassword = "";
    for (let i = 0; i < 6; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    await this.updateRegistration(registrationId, { password: newPassword });
    return newPassword;
  },

  async regenerateJoinLink(registrationId: string): Promise<string> {
    const newJoinToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await this.updateRegistration(registrationId, { joinToken: newJoinToken });
    return newJoinToken;
  },
  
  async deleteRegistration(registrationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'registrations', registrationId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `registrations/${registrationId}`);
    }
  },
  
  subscribeToRegistrationDeletion(registrationId: string, onDeleted: () => void): () => void {
    const unsubscribe = onSnapshot(doc(db, 'registrations', registrationId), (docSnap) => {
      if (!docSnap.exists()) {
        onDeleted();
      }
    }, (err) => {
      console.error("Registration deletion snapshot error:", err);
    });
    return unsubscribe;
  }
};
