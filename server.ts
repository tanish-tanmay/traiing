import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  getDoc 
} from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { 
  getRandomName, 
  generateSimulatedMessageText, 
  getContextualReply 
} from './src/lib/chatDatabase.ts';
import { sendRegistrationEmail } from './src/lib/emailService.ts';

dotenv.config();

// Initialize Firebase client on server-side
const firebaseConfig = {
  apiKey: "AIzaSyDdNg3NRzX-SAeInCyZdhh7v_quXU21SSg",
  authDomain: "traiining-eee35.firebaseapp.com",
  projectId: "traiining-eee35",
  storageBucket: "traiining-eee35.firebasestorage.app",
  messagingSenderId: "771493904728",
  appId: "1:771493904728:web:38d52ad8493fa16ea2252d",
  measurementId: "G-1FY3SHSK32"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Initialize Gemini backend with safety and fallback features
const aiApiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (aiApiKey) {
  ai = new GoogleGenAI({ apiKey: aiApiKey });
  console.log("Gemini API initialized successfully on server-side.");
} else {
  console.log("No GEMINI_API_KEY found. Server will auto-reply using offline contextual database.");
}

export const app = express();

app.use(express.json());

app.get('/api/apivideo-token', async (req, res) => {
  try {
    const apiKey = process.env.APIVIDEO_API_KEY || 'whQUXM00kPMcMAM7tAfLsJfR6LfOTSRD2hQFWclxuUY';

    // 1. Get access token
    const authRes = await fetch('https://sandbox.api.video/auth/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    const authData = await authRes.json();
    
    if (!authData.access_token) {
      throw new Error('Failed to authenticate with api.video: ' + JSON.stringify(authData));
    }

    // 2. Create delegated upload token
    const tokenRes = await fetch('https://sandbox.api.video/upload-tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ttl: 3600 })
    });
    const tokenData = await tokenRes.json();
    
    if (!tokenData.token) {
      throw new Error('Failed to create upload token: ' + JSON.stringify(tokenData));
    }

    res.json({ token: tokenData.token });
  } catch (error: any) {
    console.error("API Video Token Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/time', (req, res) => {
  res.json({ serverTime: Date.now() });
});

async function startServer() {
  const PORT = 3000;

  // Start background live sessions simulators
  startSessionSimulators();

  // Start background automated registrars SMTP dispatchers
  startRegistrationEmailListener();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Background Simulated Streams and AI Reply Manager
function startSessionSimulators() {
  interface ActiveState {
    chatsUnsubscribe: () => void;
    metricsInterval: NodeJS.Timeout;
    chatTimeout: NodeJS.Timeout | null;
    sessionDoc: any;
  }
  
  const activeSessions = new Map<string, ActiveState>();

  console.log("Background Live Stream Simulators initialized. Listening to active sessions...");

  const q = query(collection(db, 'sessions'), where('isActive', '==', true));
  
  onSnapshot(q, (snapshot) => {
    const activeIds = new Set<string>();

    snapshot.forEach((changeDoc) => {
      const sessionId = changeDoc.id;
      const data = changeDoc.data();
      activeIds.add(sessionId);

      if (!activeSessions.has(sessionId)) {
        console.log(`Creating Simulator Core for active session: ${sessionId}`);
        
        // Define initial counters if missing
        let currentViewers = data.currentViewers || data.targetViewers || 15;
        let currentLikes = data.currentLikes || data.targetLikes || 10;
        
        const sessionDocRef = doc(db, 'sessions', sessionId);
        
        // 1. Slow, realistic views and likes ramping interval
        const metricsInterval = setInterval(async () => {
          try {
            const freshSnap = await getDoc(sessionDocRef);
            if (!freshSnap.exists()) return;
            const freshData = freshSnap.data();

            const nowMs = Date.now();
            const startMs = freshData.startTimeMs || new Date(freshData.startTime).getTime();
            const durationMin = freshData.durationMinutes || 60;
            const endMs = startMs + durationMin * 60 * 1000;
            const isDuringTraining = nowMs >= startMs && nowMs <= endMs;

            if (!isDuringTraining) {
               return; // Do not simulate metrics if not during training
            }

            const targetV = freshData.targetViewers || 100;
            const targetL = freshData.targetLikes || 35;

            // Slowly increment viewers
            if (currentViewers < targetV) {
              const inc = Math.floor(Math.random() * 5) + 1; // +1 to +5
              currentViewers = Math.min(targetV, currentViewers + inc);
            } else {
              // Minimal fluctuation near target
              const fluc = Math.floor(Math.random() * 5) - 2; // -2 to +2
              currentViewers = Math.max(5, currentViewers + fluc);
            }

            // Likes follow views proportionally (ratio: ~30%-45%)
            const idealLikes = Math.floor(currentViewers * (0.32 + Math.random() * 0.12));
            if (currentLikes < targetL && currentLikes < idealLikes) {
              const inc = Math.floor(Math.random() * 3) + 1;
              currentLikes = Math.min(targetL, currentLikes + inc);
            } else if (currentLikes < idealLikes) {
              currentLikes += Math.random() < 0.25 ? 1 : 0;
            }

            await updateDoc(sessionDocRef, {
              currentViewers,
              currentLikes
            });
          } catch (e) {
            console.error(`Error syncing metrics simulation for ${sessionId}:`, e);
          }
        }, 12000);

        // 2. Simulated Auto Comments Loop
        let chatTimeout: NodeJS.Timeout | null = null;
        
        const scheduleNextAutoChat = () => {
          getDoc(sessionDocRef).then((snap) => {
            if (!snap.exists()) return;
            const sData = snap.data();

            const nowMs = Date.now();
            const startMs = sData.startTimeMs || new Date(sData.startTime).getTime();
            const durationMin = sData.durationMinutes || 60;
            const endMs = startMs + durationMin * 60 * 1000;

            const isDuringTraining = nowMs >= startMs && nowMs <= endMs;

            if (!sData.autoChatEnabled || !isDuringTraining) {
              // Idle check again in 5 seconds
              chatTimeout = setTimeout(scheduleNextAutoChat, 5000);
              return;
            }

            const speed = sData.chatSpeed || 'medium';
            let delayMs = 12000;
            if (speed === 'slow') {
              delayMs = (Math.floor(Math.random() * 16) + 20) * 1000; // 20-35s
            } else if (speed === 'medium') {
              delayMs = (Math.floor(Math.random() * 8) + 8) * 1000;  // 8-15s
            } else if (speed === 'fast') {
              delayMs = (Math.floor(Math.random() * 4) + 3) * 1000;  // 3-6s
            }

            chatTimeout = setTimeout(async () => {
              try {
                const subRef = collection(db, 'sessions', sessionId, 'chats');
                const name = getRandomName();
                const text = generateSimulatedMessageText();
                
                await addDoc(subRef, {
                  name,
                  text,
                  createdAt: Date.now(),
                  type: 'auto',
                  avatarColor: ['indigo', 'blue', 'pink', 'purple', 'emerald', 'amber'][Math.floor(Math.random() * 6)]
                });
              } catch (err) {
                console.error("Failed adding auto message:", err);
              }
              // Loop recursive call
              scheduleNextAutoChat();
            }, delayMs);
          });
        };

        scheduleNextAutoChat();

        // 3. Real Student Chat Queries and AI Answers real-time listener (Zero-Trust fallback)
        const chatsRef = collection(db, 'sessions', sessionId, 'chats');
        const chatsUnsubscribe = onSnapshot(chatsRef, (chatSnapshot) => {
          chatSnapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const chatDocData = change.doc.data();
              const chatId = change.doc.id;

              const isTriggered = chatDocData.triggerAiReply === true;

              // Any student message (real or auto) containing text is a candidate
              const isCandidate = chatDocData.text && 
                (chatDocData.type === 'real' || chatDocData.type === 'auto') && 
                !chatDocData.aiReplied && 
                !chatDocData.adminReplied;

              // Intelligently reply to approximately 5 relevant messages for every 20-30 messages (approx 25% chance)
              const shouldReply = isCandidate && (chatDocData.forceAiReply || isTriggered || Math.random() < 0.25);

              if (shouldReply) {
                // Read active session parameters to verify if AI Auto reply is configured
                const freshSessionSnap = await getDoc(sessionDocRef);
                if (!freshSessionSnap.exists()) return;
                const freshSessionData = freshSessionSnap.data();

                const nowMs = Date.now();
                const startMs = freshSessionData.startTimeMs || new Date(freshSessionData.startTime).getTime();
                const durationMin = freshSessionData.durationMinutes || 60;
                const endMs = startMs + durationMin * 60 * 1000;
                const isDuringTraining = nowMs >= startMs && nowMs <= endMs;

                if ((freshSessionData.aiReplyEnabled && isDuringTraining) || isTriggered) {
                  // Natural delay of approximately 20-35 seconds before sending response
                  const delayMs = isTriggered ? 1000 : (Math.floor(Math.random() * 16) + 20) * 1000;
                  console.log(`Matching ${chatDocData.type} message (isTriggered=${isTriggered}): "${chatDocData.text}". AI reply will fire in ${(delayMs/1000).toFixed(0)}s.`);

                  setTimeout(async () => {
                    try {
                      // Check if somebody answered manually already
                      const verifyRef = doc(db, 'sessions', sessionId, 'chats', chatId);
                      const verifySnap = await getDoc(verifyRef);
                      if (!verifySnap.exists()) return;
                      const freshVerify = verifySnap.data();
                      
                      if (freshVerify && (freshVerify.aiReplied || freshVerify.adminReplied)) {
                        console.log(`Bailing out: Admin or other support already replied to "${chatDocData.text}".`);
                        return; // Already replied
                      }

                      let replyText = "";
                      
                      // call Gemini API if initialized
                      if (ai) {
                        try {
                          const result = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: `You are answering a student's live chat question as "Trainer Support" (representing Ma'am's assistant).
CRITICAL RULES:
1. ONLY answer the student's question directly and concisely.
2. MUST start your reply by naturally addressing the student by name tagging, e.g., "@${chatDocData.name} "
3. DO NOT ask questions to Ma'am in the reply.
4. DO NOT create fake questions from the trainer's side.
5. DO NOT say things like "Ma'am, Rahul ka question hai..." or "Ma'am, please answer Rahul".
6. Speak as if you are the trainer support team directly providing the answer in simple, friendly Hinglish (Hindi + English).
7. Give a highly relevant, concise, and direct explanation. Use 1 or 2 sentences maximum.

Background Training Context:
Title: "${freshSessionData.title || ''}"
Desc: "${freshSessionData.description || ''}"

Student Name: ${chatDocData.name}
Student Question: "${chatDocData.text}"

Direct Answer:`,
                          });
                          replyText = result.text?.trim() || "";
                        } catch (aiErr: any) {
                          const errMsg = String(aiErr?.message || aiErr);
                          if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED')) {
                            console.log(`[AI rate-limit/quota] Gemini is rate-limited. Falling back to offline responses for: "${chatDocData.text}"`);
                          } else {
                            console.warn("Gemini runtime API error, falling back:", errMsg);
                          }
                        }
                      }

                      if (!replyText) {
                        // DB Contextual Lookup Fallback
                        replyText = getContextualReply(chatDocData.text);
                      }

                      // Enforce tagging the student's name if Gemini or Offline bot missed it
                      if (!replyText.toLowerCase().includes(chatDocData.name.toLowerCase())) {
                         replyText = `@${chatDocData.name} ${replyText}`;
                      }

                      // Update the matched message as replied
                      await updateDoc(verifyRef, { 
                        aiReplied: true,
                        triggerAiReply: false
                      });

                      // Add AI Response
                      await addDoc(chatsRef, {
                        name: "Trainer",
                        text: replyText,
                        createdAt: Date.now(),
                        type: 'ai',
                        isAdmin: true,
                        parentId: chatId,
                        avatarColor: 'indigo'
                      });

                      console.log(`AI posted reply: "${replyText}"`);

                    } catch (e) {
                      console.error("Error executing queued AI reply:", e);
                    }
                  }, delayMs);
                }
              }
            }
          });
        }, (err) => {
          console.error(`Firestore onSnapshot error for chats in session ${sessionId}:`, err);
        });

        // Store state references
        activeSessions.set(sessionId, {
          chatsUnsubscribe,
          metricsInterval,
          chatTimeout,
          sessionDoc: data
        });
      } else {
        // Just update doc content cache
        const existingState = activeSessions.get(sessionId);
        if (existingState) {
          existingState.sessionDoc = data;
        }
      }
    });

    // Cleanup ended sessions
    for (const [id, state] of activeSessions.entries()) {
      if (!activeIds.has(id)) {
        console.log(`Wiping Core Simulators for finished session: ${id}`);
        if (state.metricsInterval) clearInterval(state.metricsInterval);
        if (state.chatTimeout) clearTimeout(state.chatTimeout);
        state.chatsUnsubscribe();
        activeSessions.delete(id);
      }
    }
  }, (err) => {
    console.error("Firestore onSnapshot error for active sessions query:", err);
  });
}

// Dispatch secure confirmation emails upon registration in real-time
function startRegistrationEmailListener() {
  const serverBootTime = Date.now();
  console.log(`Automated SMTP registration email service started listening to registrations...`);

  onSnapshot(collection(db, 'registrations'), (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const regId = change.doc.id;
        const data = change.doc.data();

        // Check if already dispatched
        if (data.emailSent === true) {
          return;
        }

        const registeredTime = data.registeredAt ? new Date(data.registeredAt).getTime() : 0;
        const isRecent = (Date.now() - registeredTime) < 300000; // registered in last 5 minutes

        if (!data.emailSent) {
          // If it was created before our server booted and is NOT recent, we mark it as sent (skipped) so we don't spam.
          if (registeredTime > 0 && registeredTime < serverBootTime - 10000 && !isRecent) {
            console.log(`Skipping email for legacy registration: ${data.name || regId}. Marking as sent.`);
            try {
              await updateDoc(doc(db, 'registrations', regId), { emailSent: true });
            } catch (err) {
              console.error(`Failed to mark skipped registration ${regId} in DB:`, err);
            }
            return;
          }

          // Let's dispatch the modern confirmation mail using Hostinger!
          console.log(`Discovered unsent registration entry for: ${data.name || 'Anonymous attendee'} (${data.email || 'No email'}). Sending confirmation...`);
          
          try {
            const success = await sendRegistrationEmail(
              data.email,
              data.name || 'Attendee',
              data.studentId || 'N/A',
              data.password || 'N/A',
              data.joinToken || '',
              process.env.APP_URL
            );

            if (success) {
              await updateDoc(doc(db, 'registrations', regId), {
                emailSent: true,
                emailDispatchedAt: new Date().toISOString()
              });
              console.log(`Firestore registration ${regId} successfully flagged as emailSent.`);
            } else {
              await updateDoc(doc(db, 'registrations', regId), {
                emailSent: false,
                emailError: 'SMTP dispatch failed'
              });
            }
          } catch (e) {
            console.error(`Failed during email processing loop for ${regId}:`, e);
          }
        }
      }
    });
  }, (err) => {
    console.error("Firestore onSnapshot error for registrations collection:", err);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

