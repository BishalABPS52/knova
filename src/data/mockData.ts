export const feedPosts = [
  {
    id: 1,
    type: "flashcard",
    author: "User123",
    time: "2 hours ago",
    question: "What is the capital of France?",
    answer: "Paris",
    upvotes: 42,
    downvotes: 3,
    comments: 2,
    authorInitial: "U",
    authorBg: "bg-tertiary-container",
    answerBg: "bg-primary-container"
  },
  {
    id: 2,
    type: "text",
    author: "JohnDoe",
    time: "2 hours ago",
    title: "Artificial Intelligence in Education",
    content: "The integration of AI in modern classrooms is redefining the pedagogical landscape. By leveraging personalized learning algorithms, educators can now tailor curriculum delivery to individual student needs at scale...",
    upvotes: 124,
    downvotes: 12,
    comments: 1,
    authorInitial: "JD",
    authorBg: "bg-secondary-fixed text-on-secondary-fixed"
  },
  {
    id: 3,
    type: "mcq",
    author: "Knova AI",
    time: "2 hours ago",
    authorImg: "https://lh3.googleusercontent.com/aida-public/AB6AXuAY2L7I3kXQcaFzdFumU7HdxJDYUSScDgZm1FQfcdcpLHaNOKK459pdbS__hoimFR0_V-xyxbiz1xoZiMJSW6XCSV9d-DGe5PklATpNh6CFraJLtmGHNpM08yDTmrvtJQI-tX45VnndyEaGrERDNuLTFxwqSZi7AYRngKWYrBRi-gHM9c5NZBzfrH73_iRCcdH30Eg6MsSZkYoMue8SV2GLomch0Z4qJjq478vBz5ZDIOIk5cEWeCtxAHORJVNjXfeNhCHqTWj2GKM",
    question: "Which of these is a primary color?",
    options: ["Green", "Purple", "Red", "Orange"],
    correctIndex: 2,
    explanation: "Red, Blue, and Yellow are the primary colors in the RYB color model used in art.",
    upvotes: 89,
    downvotes: 5
  },
  {
    id: 4,
    type: "text",
    author: "MachineLearner",
    time: "1 hour ago",
    title: "The Future of Large Language Models",
    content: "LLMs are evolving beyond simple text generation into reasoning engines that can solve complex multi-step problems...",
    upvotes: 256,
    downvotes: 8,
    comments: 0,
    authorInitial: "ML",
    authorBg: "bg-primary-fixed text-on-primary-fixed"
  },
  {
    id: 5,
    type: "flashcard",
    author: "PhysicsFan",
    time: "1 hour ago",
    question: "What is the speed of light in a vacuum?",
    answer: "299,792,458 m/s",
    upvotes: 112,
    downvotes: 2,
    comments: 0,
    authorInitial: "P",
    authorBg: "bg-secondary text-white",
    answerBg: "bg-primary-container"
  },
  {
    id: 6,
    type: "mcq",
    author: "SwiftDev",
    time: "1 hour ago",
    authorInitial: "S",
    authorBg: "bg-secondary text-white",
    question: "Which programming language is primarily used for iOS development?",
    options: ["Java", "Swift", "Python", "C++"],
    correctIndex: 1,
    explanation: "Swift was introduced by Apple in 2014 as the primary language for iOS, macOS, watchOS, and tvOS development.",
    upvotes: 76,
    downvotes: 4
  }
];

export const spacePosts = [
  {
    id: 1,
    type: "flashcard",
    question: "What is the powerhouse of the cell?",
    answer: "Mitochondria",
    subtitle: "Produces ATP for cellular energy",
    theme: "orange",
    tag: "Biology",
    author: "BioSpark_101",
    time: "2h ago",
    upvotes: "1.2k",
    comments: 84
  },
  {
    id: 2,
    type: "mcq",
    question: "Who was the first person to walk on the moon?",
    options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"],
    correctIndex: 1,
    explanation: "Neil Armstrong was the commander of Apollo 11 and became the first human to step onto the lunar surface on July 20, 1969.",
    tags: ["History", "Space"],
    author: "HistoryArchive",
    time: "4h ago",
    upvotes: "2.8k",
    comments: 142
  },
  {
    id: 3,
    type: "text",
    title: "The Symbolism of the Green Light",
    content: "In Fitzgerald's 'The Great Gatsby', the green light at the end of Daisy's dock represents Gatsby's hopes and dreams for the future. It serves as a beacon of his unattainable desire to recreate the past.",
    tags: ["Lit", "Analysis"],
    author: "Literary_Loom",
    time: "8h ago",
    upvotes: "1.5k",
    comments: 92
  }
];

export const exploreFilters = [
  'All', 'For You', 'DBMS', 'Computer Networks', 'Machine Learning', 
  'UI/UX Design', 'Data Structures', 'Discrete Mathematics'
];

export const explorePosts = [
  { id: 1, type: "flashcard", question: "What is the difference between a process and a thread?", author: "pro_learner", upvotes: 12 },
  { id: 2, type: "mcq", tag: "DBMS", question: "Which normal form handles transitive dependency?", options: ["1NF", "2NF", "3NF", "BCNF"], author: "db_guru", upvotes: 12, correctIndex: 2 },
  { id: 3, type: "text", tag: "Networks", title: "Understanding TCP 3-Way Handshake", content: "The transmission control protocol uses a three-way handshake to establish a connection over an IP based network. The three steps are SYN, SYN-ACK, and ACK. SYN: The client sends a segment with a sequence number...", author: "net_ninja", upvotes: 12, color: "border-l-secondary" },
  { id: 4, type: "flashcard", question: "Time Complexity of Merge Sort?", author: "algo_king", upvotes: 12, bg: "bg-[#fef3ea]" },
  { id: 5, type: "mcq", tag: "Discrete Math", question: "How many edges are in a complete graph K5?", options: ["5", "10", "15", "20"], author: "math_wiz", upvotes: 12, correctIndex: 1 },
  { id: 6, type: "text", tag: "AI", title: "Linear Regression Explained", content: "A linear approach for modeling the relationship between a scalar response and one or more explanatory variables. The case of one explanatory variable is called simple linear regression.", author: "ai_research", upvotes: 12, color: "border-l-primary" },
  { id: 7, type: "flashcard", question: "Define Polymorphism in OOP", author: "coder_jane", upvotes: 12, bg: "bg-[#fef3ea]" },
  { id: 8, type: "mcq", tag: "Biology", question: "Powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome"], author: "bio_geek", upvotes: 12, correctIndex: 1 },
  { id: 9, type: "text", tag: "Physics", title: "Newton's Laws of Motion", content: "1. Law of Inertia: An object remains at rest... 2. F=ma: The acceleration of an object... 3. Action-Reaction: For every action, there is an equal and opposite...", author: "einstein_v2", upvotes: 12, color: "border-l-secondary-container" },
  { id: 10, type: "flashcard", question: "What is a Deadlock?", author: "os_master", upvotes: 12 },
  { id: 11, type: "mcq", tag: "Web Dev", question: "Which of these is NOT a JS Framework?", options: ["React", "Vue", "Laravel", "Svelte"], author: "fullstack_bob", upvotes: 12, correctIndex: 2 },
  { id: 12, type: "text", tag: "UI/UX", title: "Hick's Law", content: "Hick's Law states that the time it takes for a person to make a decision as a result of the possible choices: increasing the number of choices will increase the decision time logarithmically.", author: "design_daily", upvotes: 12, color: "border-l-on-surface-variant" }
];

export const profileInfo = {
  name: "Alex Rivera",
  handle: "@arivera_edu",
  followers: 163,
  following: 160,
  bio: "Passionate about interactive learning and AI-driven education. Currently exploring the intersection of cognitive psychology and digital game-based learning.",
  tags: [
    { name: "#Tech", class: "bg-[#fef3ea] text-[#f36710]" },
    { name: "#Travel", class: "bg-[#E0F6FE] text-[#00afef]" },
    { name: "#EdTech", class: "bg-surface-container text-on-surface-variant" },
    { name: "#Design", class: "bg-surface-container text-on-surface-variant" }
  ],
  stats: {
    postsCreated: 128,
    topicsCovered: 14,
    mcqAccuracy: "92%"
  },
  skillStats: [
    { title: "Cognitive Psychology", score: 94, color: "bg-[#00afef]" },
    { title: "Algorithm Design", score: 88, color: "bg-[#00afef]" },
    { title: "Global Economics", score: 72, color: "bg-[#f36710]" },
    { title: "Molecular Biology", score: 64, color: "bg-[#f36710]" }
  ]
};

export const profilePosts = [
  { id: 1, type: "flashcard", question: "What is the difference between a process and a thread?" },
  { id: 2, type: "mcq", tag: "DBMS", question: "Which normal form handles transitive dependency?", options: ["1NF", "2NF", "3NF", "BCNF"] },
  { id: 3, type: "text", tag: "Networks", title: "TCP 3-Way Handshake", content: "The transmission control protocol uses a three-way handshake to establish a connection over an IP based network..." },
  { id: 4, type: "flashcard", question: "Time Complexity of Merge Sort?" },
  { id: 5, type: "mcq", tag: "Discrete Math", question: "Edges in a complete graph K5?", options: ["5", "10", "15", "20"], highlightIndex: 1 },
  { id: 6, type: "text", tag: "AI", title: "Linear Regression", content: "A linear approach for modeling the relationship between a scalar response and one or more explanatory variables..." },
  { id: 7, type: "flashcard", question: "Define Polymorphism in OOP" },
  { id: 8, type: "mcq", tag: "Biology", question: "Powerhouse of the cell?", options: ["Nucleus", "Mitochondria", "Ribosome"], highlightIndex: 1 }
];
