import React, { useState, useEffect, useRef } from 'react';
import { Send, Heart, MessageSquare, Shield, Smile, Sparkles, X, ExternalLink } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, onSnapshot, collection, addDoc, query } from 'firebase/firestore';

interface Message {
  id: string;
  name: string;
  avatarColor: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
  isAdmin?: boolean;
}

// Auto detect URLs inside chat messages and render as clickable links safely
const renderTextWithLinks = (text: string) => {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.toLowerCase().startsWith('http') ? part : `https://${part}`;
      return (
        <a 
          key={index} 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-400 hover:text-blue-300 underline font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
          <ExternalLink className="w-3 h-3 inline shrink-0" />
        </a>
      );
    }
    return part;
  });
};

interface LiveChatProps {
  joinToken: string;
  studentName: string;
  viewerCount: number;
  setViewerCount: React.Dispatch<React.SetStateAction<number>>;
  likeCount: number;
  setLikeCount: React.Dispatch<React.SetStateAction<number>>;
  handleUserLike: () => void;
  sessionId?: string;
  isCustomFullscreen?: boolean;
  onFullscreenClose?: () => void;
}

// Procedural Names generator lists (100 x 50 = 5000 unique names)
const FIRST_NAMES = [
  'Amit', 'Rahul', 'Arjun', 'Priya', 'Neha', 'Rohan', 'Sneha', 'Aarav', 'Ananya', 'Divya',
  'Deepak', 'Vijay', 'Jyoti', 'Sunita', 'Rajesh', 'Manish', 'Suresh', 'Komal', 'Preeti', 'Karan',
  'Vikram', 'Anjali', 'Pooja', 'Ravi', 'Abhishek', 'Ritu', 'Sameer', 'Shalini', 'Navin', 'Kriti',
  'Aditya', 'Ishaan', 'Meera', 'Riya', 'Vivek', 'Saurabh', 'Alok', 'Neeraj', 'Shreya', 'Ridhi',
  'Pranav', 'Varun', 'Nisha', 'Asha', 'Sushma', 'Gopal', 'Madhav', 'Radha', 'Meena', 'Yash',
  'Shruti', 'Harish', 'Sanjay', 'Santosh', 'Reema', 'Gaurav', 'Nitin', 'Raman', 'Seema', 'Jyoti',
  'Ashok', 'Anil', 'Pawan', 'Kiran', 'Rani', 'Maya', 'Nishant', 'Kartik', 'Mohit', 'Tarun',
  'Siddharth', 'Pratima', 'Raj', 'Simran', 'Aman', 'Vikas', 'Chandan', 'Bipin', 'Deepika', 'Akash',
  'Ayush', 'Rupesh', 'Swati', 'Tushar', 'Pankaj', 'Sachin', 'Dinesh', 'Vinay', 'Anupam', 'Umesh',
  'Ramesh', 'Hemant', 'Sunil', 'Kishore', 'Manoj', 'Dilip', 'Sudhir', 'Brajesh', 'Yuvraj', 'Kunal'
];

const LAST_NAMES = [
  'Sharma', 'Singh', 'Soni', 'Verma', 'Patel', 'Kumar', 'Yadav', 'Gupta', 'Joshi', 'Mehta',
  'Mishra', 'Choudhary', 'Rao', 'Reddy', 'Nair', 'Pillai', 'Deshmukh', 'Kulkarni', 'Pandey', 'Dubey',
  'Jha', 'Sinha', 'Prasad', 'Ranjan', 'Sen', 'Dutta', 'Das', 'Roy', 'Chakraborty', 'Banerjee',
  'Chatterjee', 'Mukherjee', 'Solanki', 'Chauhan', 'Parmar', 'Jadeja', 'Shah', 'Modi', 'Naik', 'Shetty',
  'Rao', 'Bhat', 'Sahu', 'Swain', 'Mohanty', 'Nayak', 'Kadam', 'Shinde', 'Patil', 'Pawar'
];

// 120 base chat phrases related to training/mushroom farming that dynamically multiply
const BASE_QUESTIONS = [
  "Mushroom farming me kitna investment lagega?",
  "Oyster mushroom seeds (spawn) kaha milenge?",
  "Temperature kaise control kare summer me?",
  "Sir certificate milega kya is session ka?",
  "Substrate sterilisation kaise karna hai?",
  "Mushroom market me sell kaise kare directly?",
  "Mushroom farming as a side business kaisa rahega?",
  "Milky mushroom me kitna profit margin hai sir?",
  "Kya iske liye specific room sizing chahiye?",
  "Buttons mushroom me humidity kitni honi chahiye?",
  "Sir spawn quality check kaise kare?",
  "Is class ki recordings milegi bad me?",
  "Mushroom kitne din me nikalna shuru hota hai?",
  "Which chemicals are forbidden during sterilization?",
  "Mushroom dry karke kaise beche?",
  "Session direct offline attend kar sakte hai kya sir?",
  "Delhi me seeds seller ka contact number do please."
];

const BASE_FEEDBACK = [
  "Sir audio clear hai 👍",
  "Session bahut useful hai",
  "Thank you sir",
  "Great information 🔥",
  "First time mushroom farming seekh raha hu",
  "Bahut accha samjhaya",
  "Awaaz bilkul saaf aa rahi hai sir.",
  "Mushroom setup plan sheet mil sakti hai?",
  "Amazing explanation sir, sab simple lag raha hai.",
  "I am from UP, bahut aacha session chal raha hai.",
  "Nice and premium quality slides and audio.",
  "Clear audio and clear video presentation 🔥",
  "Bahut organic tarika bataya aapne.",
  "Sir background clean hai aur live chat speed real hai.",
  "Yes sir properly visualising everything!"
];

const GENERAL_TAGS = [
  "👍", "🔥", "👌", "❤️", "🍄", "🤩", "🙌", "💯", "धन्यवाद सर", "Bahut badhiya", "Mushroom OP"
];

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500',
  'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-rose-500'
];

export default function LiveChat({ 
  joinToken, 
  studentName, 
  viewerCount,
  setViewerCount,
  likeCount,
  setLikeCount,
  handleUserLike,
  sessionId,
  isCustomFullscreen = false,
  onFullscreenClose
}: LiveChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingStatus, setTypingStatus] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showAll, setShowAll] = useState(false);
  
  // Custom admin values subscribed via Firestore settings
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [customMessages, setCustomMessages] = useState<string[]>([]);
  
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsAtBottom(atBottom);

    // Automatically unfold older messages when candidate scrolls up near the top
    if (scrollTop < 15 && messages.length > 5 && !showAll) {
      setShowAll(true);
    }
  };

  // Subscribe to live admin chat settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'chat_simulator'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.names && Array.isArray(data.names)) {
          setCustomNames(data.names);
        }
        if (data.messages && Array.isArray(data.messages)) {
          setCustomMessages(data.messages);
        }
      }
    }, (err) => {
      console.error("Chat simulator settings snapshot error:", err);
    });
    return () => unsub();
  }, []);

  // Generate a distinct procedural name
  const getRandomName = () => {
    const namesSource = customNames.length > 0 ? customNames : FIRST_NAMES;
    const first = namesSource[Math.floor(Math.random() * namesSource.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return `${first} ${last}`;
  };

  // Generate virtual human-like message
  const generateSimulatedMessageText = (): string => {
    if (customMessages.length > 0 && Math.random() < 0.4) {
      return customMessages[Math.floor(Math.random() * customMessages.length)];
    }
    const isFeedback = Math.random() < 0.6;
    if (isFeedback) {
      const phrase = BASE_FEEDBACK[Math.floor(Math.random() * BASE_FEEDBACK.length)];
      const suffix = Math.random() < 0.5 ? ' ' + GENERAL_TAGS[Math.floor(Math.random() * GENERAL_TAGS.length)] : '';
      return `${phrase}${suffix}`;
    } else {
      const isQuestion = Math.random() < 0.7;
      if (isQuestion) {
        return BASE_QUESTIONS[Math.floor(Math.random() * BASE_QUESTIONS.length)];
      } else {
        return GENERAL_TAGS[Math.floor(Math.random() * GENERAL_TAGS.length)];
      }
    }
  };

  // Initialize with some active messages
  useEffect(() => {
    if (sessionId) return;
    const initial: Message[] = [];
    for (let i = 0; i < 8; i++) {
      initial.push({
        id: `init-${i}-${Math.random()}`,
        name: getRandomName(),
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        text: generateSimulatedMessageText(),
        timestamp: new Date(Date.now() - (8 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
    setMessages(initial);
  }, [customNames, customMessages, sessionId]);

  // Synchronize Firestore live chat history
  useEffect(() => {
    if (!sessionId) return;

    const chatsColRef = collection(db, 'sessions', sessionId, 'chats');
    const qChats = query(chatsColRef);

    const unsubscribe = onSnapshot(qChats, (snapshot) => {
      const docsList: any[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        let displayColor = 'bg-zinc-500';
        if (d.avatarColor) {
          if (d.avatarColor.startsWith('bg-')) {
            displayColor = d.avatarColor;
          } else {
            displayColor = `bg-${d.avatarColor}-500`;
          }
        } else if (d.type === 'admin') {
          displayColor = 'bg-purple-600';
        } else if (d.type === 'ai') {
          displayColor = 'bg-indigo-600';
        } else if (d.type === 'real') {
          displayColor = 'bg-green-600';
        }

        docsList.push({
          id: docSnap.id,
          name: d.name || 'Anonymous',
          text: d.text || '',
          timestamp: d.createdAt 
            ? new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: d.createdAt || Date.now(),
          isAdmin: d.isAdmin || d.type === 'admin' || d.type === 'ai',
          avatarColor: displayColor,
          isSelf: d.joinToken === joinToken || (d.name === studentName && d.type === 'real'),
          type: d.type || 'real'
        });
      });

      // Sort docs by createdAt ascending
      docsList.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(docsList);
    }, (err) => {
      console.error("Chats subscription error:", err);
    });

    return () => unsubscribe();
  }, [sessionId, studentName]);

  // Auto scroll logic (internal only - never scrolls mother page)
  useEffect(() => {
    if (containerRef.current) {
      const lastMessage = messages[messages.length - 1];
      const isForceScroll = lastMessage && lastMessage.isSelf;

      if (isAtBottom || isForceScroll) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth'
        });
        if (isForceScroll) {
          setIsAtBottom(true);
        }
      }
    }
  }, [messages, typingStatus, isAtBottom]);

  // Handle incoming live simulated chat traffic
  useEffect(() => {
    if (sessionId) return;
    // Determine random typing delay to keep chat natural
    const queueSimulatedMessage = () => {
      const delay = Math.floor(Math.random() * 4000) + 1200; // between 1.2s and 5.2s
      
      return setTimeout(() => {
        const newMessage: Message = {
          id: `sim-${Date.now()}-${Math.random()}`,
          name: getRandomName(),
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          text: generateSimulatedMessageText(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages(prev => {
          // Keep list concise in memory
          const trimmed = prev.length > 150 ? prev.slice(prev.length - 120) : prev;
          return [...trimmed, newMessage];
        });
        
        // Setup next simulation call recursively
        simTimeout = queueSimulatedMessage();
      }, delay);
    };

    let simTimeout = queueSimulatedMessage();
    return () => clearTimeout(simTimeout);
  }, [customNames, customMessages, sessionId]);

  // Smart Contextual Auto Reply logic for real students (20-25% response chance)
  const fireSmartAutoResponse = (studentQuery: string) => {
    const textLower = studentQuery.toLowerCase();
    let replyText = "";
    let responderRole = "Trainer";
    
    // Scan keywords
    if (textLower.includes("investment") || textLower.includes("paisa") || textLower.includes("kharch")) {
      replyText = "Farming shuru karne ke liye raw materials and tools me lagbhag ₹8,000-10,000 ka initial expense lagta hai. Baki detailed calculation class sheet me thodi der me dikhayenge.";
    } else if (textLower.includes("certificate") || textLower.includes("degree")) {
      replyText = "Haan ji, certification test is session ke theek bad open ho jayegi! Aap sab and me direct scan karke download kar payenge.";
    } else if (textLower.includes("spawn") || textLower.includes("beej") || textLower.includes("seed")) {
      replyText = "Hum direct government certified suppliers and trusted sellers ki live list class group me share karenge, pareshan na ho 👍";
    } else if (textLower.includes("sell") || textLower.includes("market") || textLower.includes("beche")) {
      replyText = "Mushroom locally market me asani se sell ho jata hai. Dry forms hum buyback contract me lete hai 🍄 details complete hone par aayegi!";
    } else if (textLower.includes("temperature") || textLower.includes("humidity") || textLower.includes("mausam")) {
      replyText = "Oyster and button mushrooms temperature ranges sheet hum slide par explain kar rahe hai. standard room cooling tips check kare.";
    } else if (textLower.includes("recording") || textLower.includes("hls") || textLower.includes("playback")) {
      replyText = "Yes, class complete hone ke bad registered log portal me log-in karke playback recordings 1 week tak dekh payenge.";
    } else {
      const generalAnswers = [
        "Aapka question bilkul valid hai. Sir is topic ko abhi standard parameters par details me cover kar rahe hai.",
        "Bilkul sahi kaha aapne 👍 baki queries ke liye sir direct QnA round bhi lenge is session ke end me.",
        "Yes accurate query. setup me humidity meter lagana safe rehta hai, 15 minutes wait kare, sir setup details show karenge.",
        "Hi, session live masterclass format me save ho rahi hai, details note down karte chale sab."
      ];
      replyText = generalAnswers[Math.floor(Math.random() * generalAnswers.length)];
      responderRole = "Trainer";
    }

    // Trigger typing notification and delayed response
    const typingDelay = Math.floor(Math.random() * 4000) + 3500; // 3.5s - 7.5s
    const replyDelay = Math.floor(Math.random() * 10000) + 7000; // 7s - 17s

    setTimeout(() => {
      setTypingStatus(`${responderRole} is typing...`);
    }, typingDelay);

    setTimeout(() => {
      setTypingStatus(null);
      const hostMessage: Message = {
        id: `smart-reply-${Date.now()}`,
        name: "Trainer",
        avatarColor: 'bg-[#6366f1]',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAdmin: true
      };
      setMessages(prev => [...prev, hostMessage]);
    }, replyDelay);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const queryText = inputText.trim();
    setIsAtBottom(true);

    if (sessionId) {
      try {
        const chatsColRef = collection(db, 'sessions', sessionId, 'chats');
        await addDoc(chatsColRef, {
          name: studentName,
          text: queryText,
          createdAt: Date.now(),
          type: 'real',
          avatarColor: 'bg-green-600',
          joinToken: joinToken
        });
        setInputText('');
      } catch (err) {
        console.error("Failed to post real-time chat to Firestore:", err);
      }
    } else {
      const myMessage: Message = {
        id: `me-${Date.now()}`,
        name: `${studentName} (Yoû)`,
        avatarColor: 'bg-green-600',
        text: queryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: true
      };

      setMessages(prev => [...prev, myMessage]);
      setInputText('');

      // Only 20-25% of student queries get response
      const shouldReply = Math.random() < 0.25;
      if (shouldReply) {
        fireSmartAutoResponse(queryText);
      }
    }
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-[250] flex items-center gap-2 px-4 py-2.5 bg-[#d8b4fe] hover:bg-[#c084fc] text-purple-950 dark:bg-[#a78bfa] dark:hover:bg-[#8b5cf6] dark:text-white rounded-full font-bold shadow-2xl transition duration-200 transform hover:scale-105 active:scale-95 cursor-pointer text-xs uppercase tracking-wider whitespace-nowrap border border-[#c084fc]/30"
        id="btn-restore-live-chat"
      >
        <MessageSquare className="w-4 h-4 text-white animate-pulse" />
        <span>Live Chat</span>
      </button>
    );
  }

  const containerClasses = `bg-black/40 border border-white/10 dark:bg-black/40 dark:border-white/10 light:bg-white light:border-slate-200 backdrop-blur-3xl rounded-3xl flex flex-col overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_15px_40px_rgba(0,0,0,0.6)] light:shadow-md border-t border-l border-white/10 border-r border-b border-[#000000]/50 transition-all duration-300 ${
    isCustomFullscreen 
      ? 'fixed right-6 top-1/2 -translate-y-1/2 z-[200] w-[320px] sm:w-[350px] h-[480px] max-h-[80vh]' 
      : 'flex-1 lg:flex-none lg:w-[350px] h-[380px] sm:h-[420px]'
  }`;

  return (
    <div 
      id="live-chat-panel"
      className={containerClasses}
    >
      {/* Chat Title / Header info */}
      <div className="px-5 py-3 border-b border-white/10 dark:border-white/10 light:border-slate-200/80 bg-white/5 dark:bg-white/5 light:bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-xs sm:text-sm font-bold text-white/90 dark:text-white/90 light:text-slate-800">Live Chat</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest font-mono">Live</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isCustomFullscreen && onFullscreenClose) {
                onFullscreenClose();
              } else {
                setIsMinimized(true);
              }
            }}
            className="p-1 text-zinc-400 hover:text-white dark:text-zinc-400 dark:hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            title="Minimize Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col scrollbar-width-thin scrollbar-thumb-white/10 overscroll-contain touch-pan-y [webkit-overflow-scrolling:touch]"
        style={{ height: isCustomFullscreen ? '300px' : '280px' }}
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col space-y-1 max-w-[85%] ${msg.isSelf ? 'self-end items-end' : 'self-start'}`}
            id={`msg-${msg.id}`}
          >
            {/* Header info name */}
            <div className="flex items-center space-x-1.5 px-1">
              {!msg.isSelf && (
                <span className={`w-2 h-2 rounded-full ${msg.avatarColor} shrink-0 shadow-sm`}></span>
              )}
              <span className={`text-[10px] sm:text-xs font-bold truncate ${
                msg.isSelf 
                  ? 'text-green-400' 
                  : msg.isAdmin 
                    ? 'text-indigo-400 flex items-center space-x-0.5 font-extrabold' 
                    : 'text-zinc-400'
              }`}>
                {msg.isAdmin && <Shield className="w-3 h-3 text-indigo-400 mr-0.5 inline shrink-0" />}
                {msg.name}
              </span>
              <span className="text-[9px] text-zinc-500 dark:text-zinc-500 light:text-slate-400 scale-[0.9] font-mono">{msg.timestamp}</span>
            </div>

            {/* Bubble body text */}
            <div className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm shadow-md break-words ${
              msg.isSelf
                ? 'bg-green-600/25 border border-green-500/30 text-green-50 dark:bg-green-600/25 dark:border-green-500/30'
                : msg.isAdmin
                  ? 'bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 text-indigo-50 dark:from-indigo-900/40 dark:to-purple-900/40 font-medium'
                  : 'bg-white/[0.04] dark:bg-white/[0.04] border border-white/5 dark:border-white/5 light:bg-slate-100 light:border-slate-200/50 text-white/90 dark:text-white/90 light:text-slate-800'
            }`}>
              {renderTextWithLinks(msg.text)}
            </div>
          </div>
        ))}
        
        {/* Real typing status indicator */}
        {typingStatus && (
          <div className="self-start flex flex-col space-y-1">
            <span className="text-[10px] text-indigo-400/80 flex items-center space-x-1 pl-1">
              <Sparkles className="w-3 h-3 animate-spin text-indigo-400" />
              <span>{typingStatus}</span>
            </span>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input controls Footer Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 dark:border-white/10 light:border-slate-200 bg-white/5 dark:bg-white/5 light:bg-slate-50 flex items-center space-x-2 shrink-0">
        <div className="flex-1 bg-black/40 border border-white/10 dark:bg-black/40 dark:border-white/10 light:bg-white light:border-slate-300 rounded-xl flex items-center p-1 px-2 focus-within:border-indigo-500/50 transition-all shadow-inner">
          <input
            type="text"
            required
            placeholder="Ask a question or reply..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-transparent px-2.5 py-2 focus:outline-none text-xs sm:text-sm text-white dark:text-white light:text-slate-800 light:placeholder-slate-400"
          />
          <button
            type="button"
            className="p-1 hover:bg-white/5 hover:text-white text-zinc-400 dark:text-zinc-400 light:text-slate-500 light:hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            onClick={handleUserLike}
            title="Send Love reaction"
          >
            <Heart className="w-4 h-4 text-pink-500 hover:text-pink-400" fill="currentColor" strokeWidth={0} />
          </button>
        </div>
        <button
          type="submit"
          className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition-all active:scale-95 cursor-pointer shadow-md disabled:opacity-40"
          disabled={!inputText.trim()}
          title="Send message"
        >
          <Send className="w-4 h-4 drop-shadow-sm" />
        </button>
      </form>
    </div>
  );
}
