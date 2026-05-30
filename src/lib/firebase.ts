import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDdNg3NRzX-SAeInCyZdhh7v_quXU21SSg",
  authDomain: "traiining-eee35.firebaseapp.com",
  projectId: "traiining-eee35",
  storageBucket: "traiining-eee35.firebasestorage.app",
  messagingSenderId: "771493904728",
  appId: "1:771493904728:web:38d52ad8493fa16ea2252d",
  measurementId: "G-1FY3SHSK32"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

