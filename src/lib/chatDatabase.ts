// Procedural generation database for Indian names and Hinglish Mushroom Farming comments
// Strictly conforms to the constraint: NEVER use "Sir", always use "Ma'am" for trainers!

export const MALE_FIRST_NAMES = [
  'Amit', 'Rahul', 'Arjun', 'Aarav', 'Deepak', 'Vijay', 'Rajesh', 'Manish', 'Suresh', 'Karan',
  'Vikram', 'Ravi', 'Abhishek', 'Sameer', 'Navin', 'Aditya', 'Ishaan', 'Vivek', 'Saurabh', 'Alok',
  'Neeraj', 'Pranav', 'Varun', 'Gopal', 'Madhav', 'Yash', 'Harish', 'Sanjay', 'Santosh', 'Gaurav',
  'Nitin', 'Raman', 'Ashok', 'Anil', 'Pawan', 'Nishant', 'Kartik', 'Mohit', 'Tarun', 'Siddharth',
  'Raj', 'Aman', 'Vikas', 'Chandan', 'Bipin', 'Akash', 'Ayush', 'Rupesh', 'Tushar', 'Kunal'
];

export const FEMALE_FIRST_NAMES = [
  'Priya', 'Neha', 'Sneha', 'Ananya', 'Divya', 'Jyoti', 'Sunita', 'Komal', 'Preeti', 'Anjali',
  'Pooja', 'Ritu', 'Shalini', 'Kriti', 'Meera', 'Riya', 'Shreya', 'Ridhi', 'Nisha', 'Asha',
  'Sushma', 'Radha', 'Meena', 'Shruti', 'Reema', 'Seema', 'Rani', 'Maya', 'Simran', 'Deepika',
  'Swati', 'Poonam', 'Kavita', 'Suman', 'Reena', 'Payal', 'Aarti', 'Rekha', 'Sapna', 'Mamta',
  'Kiran', 'Sheetal', 'Priyanka', 'Chanda', 'Shweta', 'Tanvi', 'Ankita', 'Bhavna', 'Rashmi', 'Pratibha'
];

export const LAST_NAMES = [
  'Sharma', 'Singh', 'Verma', 'Patel', 'Kumar', 'Yadav', 'Gupta', 'Joshi', 'Mehta', 'Mishra',
  'Choudhary', 'Rao', 'Reddy', 'Nair', 'Pillai', 'Deshmukh', 'Kulkarni', 'Pandey', 'Dubey', 'Jha',
  'Sinha', 'Prasad', 'Ranjan', 'Sen', 'Dutta', 'Das', 'Roy', 'Chakraborty', 'Banerjee', 'Chatterjee',
  'Mukherjee', 'Solanki', 'Chauhan', 'Parmar', 'Jadeja', 'Shah', 'Modi', 'Naik', 'Shetty', 'Bhat',
  'Sahu', 'Swain', 'Mohanty', 'Nayak', 'Kadam', 'Shinde', 'Patil', 'Pawar', 'Tiwari', 'Bajpai'
];

const INTROS = [
  "Ma'am, ",
  "Hello Ma'am, ",
  "Namaste Ma'am, ",
  "Hii Ma'am, ",
  "Good evening Ma'am, ",
  "Mera ek clear question hai Ma'am, ",
  "Please answer me Ma'am, ",
  "Ma'am please help, ",
  "Can you guide us Ma'am, ",
  "Ma'am, mai Bihar se hu, ",
  "Ma'am, mai MP se bol raha hu, ",
  "Mushroom setup me, ",
  "Mushroom farming start krte time, ",
  "Maine abhi training join ki h, ",
  "Actually Ma'am, ",
  "Is topic pr doubt tha Ma'am, ",
  "Bahut helpful class chal rhi h, par ",
  "Ma'am ek guidance chahiye thi, ",
  "Muje poochna tha ki ",
  "Kya "
];

const SUBJECTS = [
  "Oyster mushroom seeds (spawn)",
  "Milky mushroom setup",
  "Substrate sterilization chemical usage",
  "Room humidity parameters",
  "Summer temperature regulation (cooling)",
  "Button mushroom casing layer",
  "Mushroom dry karke direct selling",
  "Mushroom buyback contracts",
  "Initial investment of rs 10000",
  "Ventilation and air circulation",
  "Spawn quality check",
  "Contamination / Green mold management",
  "Compost preparation time",
  "Shed construction using bamboo",
  "Bags packing and spacing guide",
  "Water spraying and moisture",
  "Marketing strategy in local mandi",
  "Training certificate verification",
  "Govt subsidies on mushroom projects",
  "Mushroom spawn storage in fridge"
];

const ACTIONS = [
  "ko kaise regulate or control karein?",
  "kahan se best rate me purchase karein?",
  "me kitna exact expense/cost aayega?",
  "ke kitne days baad crop nikalne lagti h?",
  "me medicinal value organic farming kaisa rahega?",
  "ke liye physical setup design kaisa hona chahiye?",
  "ka best and easiest process kya h?",
  "me contamination ka sabse bada reason kya hai?",
  "ko hum apne home terrace me start kar sakte hain kya?",
  "ke liye govt license is mandatory or not?",
  "ko fresh sell karne me price badhiya milti h kya?",
  "ka practical demonstration phirse show kr sakte hain?",
  "ko direct dry sell karne me registration form online mil rha h?",
  "me margin scale or daily profit calculations kaise soche?"
];

const FEEDBACKS_PRAISES = [
  "Aapka screen display setup perfectly visible h Ma'am 👍",
  "Audio is absolutely clean, clear voice Ma'am",
  "Sahi me bhut detail me organic mushroom sikha rhe ho aap",
  "Ma'am slides presentation simple and comprehensive h",
  "Amazing explanation, all steps are completely crystal clear!",
  "UP, Varanasi se dekh rhi hu, live support accha h Ma'am 🔥",
  "Yes Ma'am, properly visualising and listing points",
  "This is the best mushroom farming webinar I have attended",
  "Mera sara basic doubt clear ho gya mushroom cultivation pr",
  "Thank you Ma'am for explaining buyback rules so transparently",
  "Very useful slideshow representation 🍄",
  "Mushroom farming ka potential sach me India me high h!",
  "Your background visual and live chat speed is comfortable",
  "Hume setup blueprint template files group link par milegi kya?",
  "Perfect training, standard procedures clearly structured",
  "Mera setup complete h, spawn delivery ka wait h organic farm se 👍",
  "Ma'am certificates scan mechanism and test timing sahi rkha h",
  "Excellent presentation Ma'am, full rating class ke baad dunga"
];

const SHORT_TAGS = [
  "👍", "🔥", "🍄", "❤️", "💯", "👌", "🤩", "🙌", "धन्यवाद Ma'am", "Mushroom cultivation op!", "Pranam Ma'am", "Super clear session"
];

export function getRandomName(): string {
  const isMale = Math.random() < 0.5;
  const first = isMale 
    ? MALE_FIRST_NAMES[Math.floor(Math.random() * MALE_FIRST_NAMES.length)]
    : FEMALE_FIRST_NAMES[Math.floor(Math.random() * FEMALE_FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

export function generateSimulatedMessageText(): string {
  const roll = Math.random();
  if (roll < 0.4) {
    // Standard structured Hinglish question
    const intro = INTROS[Math.floor(Math.random() * INTROS.length)];
    const subj = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
    const act = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    return `${intro}${subj} ${act}`;
  } else if (roll < 0.8) {
    // Praises or feedback comments
    const praise = FEEDBACKS_PRAISES[Math.floor(Math.random() * FEEDBACKS_PRAISES.length)];
    const tag = Math.random() < 0.4 ? ' ' + SHORT_TAGS[Math.floor(Math.random() * SHORT_TAGS.length)] : '';
    return `${praise}${tag}`;
  } else {
    // Pure emoji or short text expressions
    return SHORT_TAGS[Math.floor(Math.random() * SHORT_TAGS.length)];
  }
}

// Key-based automated helper for AI reply logic (Hinglish responses)
export function getContextualReply(userInputText: string): string {
  const textLower = userInputText.toLowerCase();
  
  if (textLower.includes("investment") || textLower.includes("paisa") || textLower.includes("kharch") || textLower.includes("budget") || textLower.includes("cost")) {
    return "Mushroom farming zero-scale se ₹8,000-10,000 ke organic setup and spawn inputs me easily start ho jati h. Margin returns thodi der me slider details par active honge.";
  }
  if (textLower.includes("certificate") || textLower.includes("degree") || textLower.includes("digri") || textLower.includes("paper")) {
    return "Haan ji, certification portal training session ke clear completion ke immediately bad live verify ho jayenge, aap sab download kar payenge guidelines ke along.";
  }
  if (textLower.includes("spawn") || textLower.includes("beej") || textLower.includes("seed") || textLower.includes("bhej") || textLower.includes("beej")) {
    return "Authorized and certified spawns (seeds) supplies list hum humare mushroom support group and student console me share karenge verified contacts ke sath. Don't worry!";
  }
  if (textLower.includes("sell") || textLower.includes("market") || textLower.includes("beche") || textLower.includes("biche") || textLower.includes("sale") || textLower.includes("sold")) {
    return "Local vegetable mandis me fresh oysters directly sale ho jati h. High scale dry oysters hum active buyback agreement contract me bulk pricing control par buy kar lete hain.";
  }
  if (textLower.includes("temperature") || textLower.includes("humidity") || textLower.includes("cooling") || textLower.includes("mausam") || textLower.includes("garmi") || textLower.includes("humidity") || textLower.includes("room")) {
    return "Summer me mushroom setups me double burlap walls and sand beds use karke standards temperature 22-26°C or humidity 80% maintain rkhna easiest and cost-free process h.";
  }
  if (textLower.includes("recording") || textLower.includes("hls") || textLower.includes("playback") || textLower.includes("video") || textLower.includes("dobara") || textLower.includes("miss")) {
    return "Yes! Class session wrap up hone ke baad registered accounts, login credentials k along portal dashboard me login karke 1 week tak flexible watch or replay check kr payenge.";
  }
  if (textLower.includes("oyster") || textLower.includes("button") || textLower.includes("milky") || textLower.includes("dhingri") || textLower.includes("type") || textLower.includes("mushroom")) {
    return "Masterclass me hum Button Mushroom, Milky Mushroom aur Oyster (Dhingri) mushrooms teeno major high-yield species ki organic farming, soil casing, and disease standard cycle cover kr rhe h.";
  }
  if (textLower.includes("compost") || textLower.includes("bhoosa") || textLower.includes("gobar") || textLower.includes("straw") || textLower.includes("steril")) {
    return "Substrate (bhoosa) sterilization ke liye thermal steam treatment ya safe chemical method (Chemical ratio details screen par visible) best hai. Casing layer formation step-by-step bataya jayega.";
  }
  if (textLower.includes("hi") || textLower.includes("hello") || textLower.includes("hey") || textLower.includes("namaste") || textLower.includes("pranam") || textLower.includes("good evening")) {
    return "Namaste! Mushroom Live training me swagat h aapka. Koi bhi sawal ho toh bejhijhak live chat par poochiye, team full assist karegi 👍";
  }
  if (textLower.includes("nice") || textLower.includes("great") || textLower.includes("excellent") || textLower.includes("helpful") || textLower.includes("useful") || textLower.includes("best") || textLower.includes("clear") || textLower.includes("sahi")) {
    return "Bohot bohot dhanyawad class support karne ke liye! Organic cultivation sikhna aur iska micro-business start karna bohot hi potential sector hai.";
  }
  
  const generalStandardReplies = [
    "Aapki clear query bilkul accurate h! Ma'am abhi exact isi scale parameter layout slides ko clear screen flow me properly highlight karke cover karne wale h.",
    "Bhut badhiya and important question poocha aapne! live context details QnA slide round me directly support or queries answers ke along open rkhenge Ma'am.",
    "Hum active mushroom student support sheet and files direct resources tab me de rahe hain, perfect setups details visual notes check rkhein."
  ];
  return generalStandardReplies[Math.floor(Math.random() * generalStandardReplies.length)];
}
