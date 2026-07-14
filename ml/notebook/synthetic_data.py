# STEP 1: SYNTHETIC DATA GENERATION (Knova Engine - v3.2 Balanced + Flip Fix + Topic Tags)
!pip install faker pandas numpy matplotlib seaborn tqdm -q

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm
import random
from faker import Faker
from datetime import datetime, timedelta  # Added for proper date generation

# Initialize Seeds for Reproducibility
fake = Faker()
np.random.seed(42)
random.seed(42)

print("🚀 Starting Knova Synthetic Data Generation (Step 1 - Balanced Telemetry + Tags)...")


# 1. CONFIGURATION & TOPIC KNOWLEDGE BASE

N_USERS = 2000
N_CONTENT = 10000

TOPIC_BANK = {
    # --- Software & Computer Science (theoretical + practical) ---
    "DBMS": ["SQL", "Indexing", "ACID properties", "Normalization", "NoSQL", "Primary Key"],
    "Software Engineering": ["SDLC", "Agile/Scrum", "Version control", "Code reviews", "Design patterns"],
    "Programming Fundamentals": ["Python", "JavaScript", "OOP", "Recursion", "Memory management"],
    "Web Development": ["React", "Next.js", "REST APIs", "CSS layouts", "Full-stack projects"],
    "Mobile App Development": ["Flutter", "React Native", "App Store guidelines", "Push notifications"],
    "Machine Learning": ["Supervised learning", "Regression", "Decision trees", "LightGBM", "LLMs"],
    "Computer Vision": ["Convolutional layers", "Image segmentation", "Edge detection", "OpenCV"],
    "Cybersecurity": ["Phishing scams", "Password managers", "VPNs", "Ethical hacking", "Encryption"],
    "Cloud Computing": ["AWS basics", "Docker", "Kubernetes", "Serverless functions", "CI/CD"],
    "Data Analysis": ["Excel formulas", "SQL queries", "Dashboards", "Power BI", "Data cleaning"],
    "AI": ["Artificial Intelligence", "ai", "Intelligent system"],
    "Discrete Mathematics": ["Graph theory", "Set theory", "Combinatorics", "Boolean algebra"],
    "Cryptocurrency & Web3": ["Bitcoin basics", "Wallet security", "Smart contracts", "Blockchain explained"],
    # --- NEW: standalone programming language/stack topics ---
    "Java Programming": ["OOP in Java", "JVM internals", "Spring Boot", "Multithreading", "Exception handling", "Collections framework", "Interfaces & abstract classes", "Garbage collection", "JDBC"],
    "C Programming": ["Pointers", "Memory management", "Structs", "Bitwise operations", "Header files", "Dynamic allocation", "Recursion in C", "File handling", "Preprocessor directives"],
    "MERN Stack": ["MongoDB schemas", "Express routing", "React components", "Node.js event loop", "JWT auth", "REST integration", "Middleware", "State management", "API design"],

    # --- Hardware & Electronics ---
    "Computer Hardware": ["CPU architecture", "RAM types", "Motherboard components", "Building a PC"],
    "Electronics & Circuits": ["Ohm's law", "Breadboarding", "Microcontrollers", "Sensors", "Arduino projects"],
    "Embedded Systems": ["Firmware", "Real-time OS", "IoT devices", "PCB design basics"],
    "Robotics": ["Actuators", "Robotic arms", "Path planning", "ROS basics", "Drone building"],

    # --- Engineering (theoretical + real-world) ---
    "Mechanical Engineering": ["CAD modeling", "Machine design", "Manufacturing processes", "Gear systems"],
    "Structural Engineering": ["Concrete mix", "Beam deflection", "Shear force", "Bending moment"],
    "Civil Engineering & Construction": ["Site surveying", "Building codes", "Project estimation", "Materials"],
    "Electrical Engineering": ["Circuit analysis", "Power systems", "Transformers", "Signal processing"],
    "Classical Mechanics": ["Newton's laws", "Kinematics", "Vector math", "Torque", "Friction"],
    "Fluid Mechanics": ["Bernoulli equation", "Reynolds number", "Viscosity", "Pipe flow"],
    "Thermodynamics": ["Entropy", "Laws of thermodynamics", "Heat engines", "Refrigeration cycles"],
    "Soil Mechanics": ["Soil compaction", "Bearing capacity", "Effective stress", "Slope stability"],
    "Automobiles & EVs": ["Engine maintenance", "EV battery tech", "Fuel efficiency", "New model reviews"],

    # --- Architecture & Design ---
    "Architecture": ["Floor planning", "Building materials", "Sustainable design", "Site orientation"],
    "Architectural History": ["Brutalism", "Gothic vaulting", "Bauhaus philosophy", "Pagoda style"],
    "Graphic Design": ["Typography", "Color theory", "Figma workflows", "Logo design"],
    "UI/UX Design": ["Wireframing", "User research", "Design systems", "Prototyping"],
    "Interior Design": ["Space planning", "Lighting design", "Furniture layout", "Color palettes"],

    # --- Math & Pure Sciences ---
    "Linear Algebra": ["Matrices", "Eigenvalues", "Vector spaces", "Matrix multiplication"],
    "Calculus": ["Derivatives", "Integration", "Limits", "Gradient descent"],
    "Probability & Stats": ["Bayes theorem", "Normal distribution", "Standard deviation"],
    "Classical Physics": ["Wave-particle duality", "Electromagnetism", "Optics", "Nuclear physics"],
    "Astronomy & Space": ["Stellar evolution", "Black holes", "Space missions", "Stargazing tips"],
    "Cell Biology": ["Mitosis", "Organelles", "Cell membrane", "ATP synthesis"],
    "Genetics": ["DNA replication", "RNA transcription", "Mendelian laws", "CRISPR"],
    "Human Anatomy": ["Cardiovascular system", "Synaptic transmission", "Endocrine glands"],
    "Organic Chemistry": ["Hydrocarbons", "Functional groups", "Resonance structures"],
    "Environmental Science": ["Carbon cycle", "Biodiversity tracking", "Trophic levels"],
    "Climate & Sustainability": ["Renewable energy", "Air quality", "Recycling myths", "Green tech"],
    "Geomorphology": ["Plate tectonics", "Rock cycle", "River erosion", "Glacial landforms"],
    "Hydrology": ["Rainfall-runoff", "Catchment area", "Groundwater flow", "Hydrograph"],
    "Agronomy": ["Soil nutrients", "Crop rotation", "Irrigation efficiency", "Urban farming"],

    # --- Business, Finance & Career ---
    "Financial Accounting": ["Balance sheets", "Income statements", "Cash flow", "Double entry"],
    "Corporate Finance": ["Portfolio diversification", "Capital budgeting", "Valuation basics"],
    "Personal Finance": ["Budgeting apps", "Emergency fund", "Credit score", "Debt payoff"],
    "Stock Market Investing": ["Nepal Stock Exchange", "Mutual funds", "Dividend stocks"],
    "Macroeconomics": ["GDP calculation", "Inflation metrics", "Fiscal policy", "Monetary policy"],
    "Microeconomics": ["Monopoly pricing", "Oligopoly", "Consumer surplus", "Opportunity cost"],
    "Strategic Management": ["SWOT analysis", "Porter's five forces", "Market penetration"],
    "HR Management": ["Talent acquisition", "Performance appraisal", "Labor relations"],
    "Startups & Entrepreneurship": ["Pitch decks", "MVP building", "Bootstrapping", "Fundraising"],
    "Freelancing": ["Client contracts", "Pricing your work", "Invoicing", "Scope creep"],
    "E-commerce & Online Business": ["Dropshipping", "Shopify setup", "Ad campaigns"],
    "Career Growth": ["Salary negotiation", "Performance reviews", "Networking", "Career pivots"],
    "Real Estate & Property": ["Renting vs buying", "Property investment", "Home loans"],

    # --- Humanities & Social Sciences ---
    "History of Nepal": ["Lichchhavi period", "Malla dynasty", "Unification era", "Bhimsen Thapa"],
    "Nepali Culture & Festivals": ["Newari traditions", "Folk stories", "Major festivals"],
    "Nepali Literature": ["Laxmi Prasad Devkota", "Muna Madan", "Parijat", "Shirishko Phool"],
    "Modern English Fiction": ["George Orwell", "Dystopian fiction", "Post-colonialism"],
    "World Mythology": ["Archetypes", "Monomyth", "Oral traditions", "Deity pantheons"],
    "Philosophy": ["Dualism", "Empiricism", "Rationalism", "Consciousness"],
    "Political Philosophy": ["Social contract", "Separation of powers", "Totalitarianism"],
    "Current Affairs & Politics": ["Election coverage", "Policy explainers", "Geopolitics"],
    "International Law": ["Sovereignty", "Treaty ratification", "Humanitarian law"],
    "Psychology & Human Behavior": ["Cognitive bias", "Classical conditioning", "Habit formation"],
    "Linguistics": ["Syntax trees", "Phonemes", "Morphology", "Language learning tips"],
    "Archeology": ["Stratigraphy", "Radiocarbon dating", "Artifact conservation"],

    # --- Lifestyle & Personal ---
    "Fitness & Strength Training": ["Progressive overload", "Home workouts", "Gym routines"],
    "Nutrition & Diet": ["Macros", "Meal prep", "Intermittent fasting", "Reading food labels"],
    "Mental Health": ["Anxiety management", "Therapy basics", "Journaling", "Sleep hygiene"],
    "Cooking & Recipes": ["Nepali cuisine", "Quick weeknight meals", "Baking basics"],
    "Skincare & Grooming": ["Routine building", "Ingredient guides", "Sunscreen myths"],
    "Fashion & Style": ["Wardrobe basics", "Seasonal trends", "Thrifting"],
    "Parenting": ["Screen time limits", "Sleep training", "Toddler tantrums"],
    "Relationships & Dating": ["Communication tips", "Breakup recovery", "Red flags"],
    "Productivity": ["Time blocking", "Deep work", "Habit tracking", "Study techniques"],

    # --- Travel, Sports & Entertainment ---
    "Adventure Tourism": ["Everest Base Camp", "Annapurna Circuit", "Mountaineering permits"],
    "Cultural Tourism": ["Lumbini pilgrimage", "Buddhist circuits", "Pashupatinath heritage"],
    "Budget Travel": ["Flight deals", "Backpacking routes", "Travel itineraries"],
    "Sports Science": ["Biomechanics", "Aerobic threshold", "Kinematics", "Ball trajectory"],
    "Football (Soccer)": ["Tactics breakdown", "Transfer news", "Fantasy leagues"],
    "Cricket Analytics": ["Batting technique", "IPL analysis", "Fantasy cricket", "Match strategy"],
    "Gaming & Esports": ["Speedrunning", "Console vs PC", "Indie games", "Esports tournaments"],
    "Cinema Studies": ["Cinematography", "Screenplay structure", "Color grading"],
    "Music Theory & Production": ["Harmonic progression", "Beat making", "DAW tutorials"],
    "Photography": ["Camera settings", "Composition rules", "Editing basics"],

    # --- NEW: Entrance & standardized exams, each a standalone topic ---
    "IOE Entrance Exam": ["Physics numericals", "Chemistry reactions", "Engineering mathematics", "IOE syllabus", "Previous year questions", "Objective-type practice", "Merit list cutoffs", "Entrance mock tests"],
    "CEE Exam": ["Biology MCQs", "Physics for CEE", "Chemistry for CEE", "CEE syllabus", "MBBS admission", "BDS admission", "Previous year CEE papers", "Merit list"],
    "NEET Exam": ["NEET Biology", "NEET Physics", "NEET Chemistry", "NCERT based questions", "NEET syllabus", "Mock test series", "Previous year NEET papers", "Rank prediction"],
    "IELTS Preparation": ["Listening practice", "Reading comprehension", "Writing task 1 & 2", "Speaking fluency", "Band score criteria", "Academic vs General IELTS", "Vocabulary building", "Mock IELTS tests"],
    "PTE Preparation": ["PTE speaking tasks", "PTE writing essays", "PTE reading fill-in-blanks", "PTE listening summarize", "Score prediction", "PTE syllabus", "Template strategies", "Mock PTE tests"],
}

# =======================================================
# NEW: TOPIC_TAGS — metadata-only relatedness table, never fed into content text
# Powers topic-to-topic Jaccard similarity in Step 4, separate from TOPIC_BANK keywords
# =======================================================
TOPIC_TAGS = {
    "DBMS": ["database", "sql", "backend", "programming", "software", "computer_science", "tech"],
    "Software Engineering": ["sdlc", "agile", "programming", "software", "computer_science", "tech", "career"],
    "Programming Fundamentals": ["python", "javascript", "oop_basics", "programming", "software", "computer_science", "tech", "algorithms"],
    "Web Development": ["react", "nextjs", "frontend", "backend", "fullstack", "programming", "software", "computer_science", "tech"],
    "Mobile App Development": ["flutter", "react_native", "mobile", "programming", "software", "computer_science", "tech"],
    "Java Programming": ["java", "oop", "jvm", "backend", "programming", "software", "computer_science", "tech", "algorithms"],
    "C Programming": ["c_language", "pointers", "low_level", "programming", "software", "computer_science", "tech", "algorithms", "embedded"],
    "MERN Stack": ["mongodb", "express", "react", "nodejs", "fullstack", "frontend", "backend", "programming", "software", "computer_science", "tech", "web_development"],
    "Machine Learning": ["ml", "regression", "model_training", "ai_ml", "data", "algorithms", "programming", "software", "computer_science", "tech"],
    "Computer Vision": ["image_processing", "cnn", "deep_learning", "ai_ml", "data", "algorithms", "programming", "software", "computer_science", "tech"],
    "Cybersecurity": ["security", "phishing", "encryption", "network_security", "programming", "software", "computer_science", "tech"],
    "Cloud Computing": ["aws", "docker", "kubernetes", "devops", "backend", "programming", "software", "computer_science", "tech"],
    "Data Analysis": ["excel", "sql", "dashboards", "data", "statistics", "algorithms", "programming", "software", "computer_science", "tech"],
    "AI": ["artificial_intelligence", "automation", "ai_ml", "data", "algorithms", "programming", "software", "computer_science", "tech"],
    "Discrete Mathematics": ["graph_theory", "set_theory", "math", "algorithms", "programming", "computer_science", "tech", "ioe_subject"],
    "Cryptocurrency & Web3": ["bitcoin", "blockchain", "finance", "tech", "programming", "software", "computer_science"],

    "Computer Hardware": ["cpu", "ram", "pc_building", "hardware", "electronics", "tech", "computer_science"],
    "Electronics & Circuits": ["ohms_law", "microcontrollers", "arduino", "hardware", "electronics", "tech", "engineering"],
    "Embedded Systems": ["firmware", "rtos", "iot", "hardware", "electronics", "tech", "engineering", "programming", "c_programming"],
    "Robotics": ["actuators", "path_planning", "ros", "drones", "hardware", "electronics", "engineering", "tech", "ai_ml", "programming"],

    "Mechanical Engineering": ["cad", "machine_design", "manufacturing", "engineering", "hardware", "math", "physics", "ioe_subject"],
    "Structural Engineering": ["concrete", "beam_deflection", "shear_force", "engineering", "math", "physics", "construction"],
    "Civil Engineering & Construction": ["surveying", "building_codes", "engineering", "construction", "math", "ioe_subject"],
    "Electrical Engineering": ["circuit_analysis", "power_systems", "engineering", "electronics", "hardware", "math", "ioe_subject"],
    "Classical Mechanics": ["newtons_laws", "kinematics", "torque", "physics", "math", "engineering", "science", "ioe_subject", "neet_subject"],
    "Fluid Mechanics": ["bernoulli", "reynolds_number", "viscosity", "physics", "engineering", "math", "science"],
    "Thermodynamics": ["entropy", "heat_engines", "physics", "engineering", "math", "science", "ioe_subject"],
    "Soil Mechanics": ["soil_compaction", "bearing_capacity", "engineering", "construction", "science"],
    "Automobiles & EVs": ["engine_maintenance", "ev_battery", "engineering", "automotive", "tech"],

    "Architecture": ["floor_planning", "sustainable_design", "design", "engineering", "construction", "creative"],
    "Architectural History": ["brutalism", "gothic", "bauhaus", "history", "design", "culture", "creative", "art"],
    "Graphic Design": ["typography", "color_theory", "figma", "design", "creative", "art"],
    "UI/UX Design": ["wireframing", "user_research", "prototyping", "design", "creative", "programming", "tech", "software", "web_development"],
    "Interior Design": ["space_planning", "lighting_design", "design", "creative", "art"],

    "Linear Algebra": ["matrices", "eigenvalues", "math", "algorithms", "programming", "science", "ioe_subject"],
    "Calculus": ["derivatives", "integration", "gradient_descent", "math", "science", "ai_ml", "ioe_subject"],
    "Probability & Stats": ["bayes_theorem", "normal_distribution", "math", "data", "science", "ai_ml"],
    "Classical Physics": ["electromagnetism", "optics", "nuclear_physics", "physics", "math", "science", "ioe_subject", "neet_subject"],
    "Astronomy & Space": ["stellar_evolution", "black_holes", "space_missions", "physics", "science", "space"],
    "Cell Biology": ["mitosis", "organelles", "atp_synthesis", "biology", "science", "health", "neet_subject", "cee_subject"],
    "Genetics": ["dna_replication", "mendelian_laws", "crispr", "biology", "science", "health", "neet_subject", "cee_subject"],
    "Human Anatomy": ["cardiovascular_system", "endocrine_glands", "biology", "science", "health", "neet_subject", "cee_subject"],
    "Organic Chemistry": ["hydrocarbons", "functional_groups", "chemistry", "science", "neet_subject", "cee_subject", "ioe_subject"],
    "Environmental Science": ["carbon_cycle", "biodiversity", "environment", "science", "sustainability", "biology"],
    "Climate & Sustainability": ["renewable_energy", "green_tech", "environment", "science", "sustainability"],
    "Geomorphology": ["plate_tectonics", "rock_cycle", "earth_science", "science", "environment"],
    "Hydrology": ["rainfall_runoff", "groundwater", "earth_science", "science", "environment", "civil_engineering"],
    "Agronomy": ["soil_nutrients", "crop_rotation", "agriculture", "science", "environment"],

    "Financial Accounting": ["balance_sheets", "cash_flow", "finance", "business", "career"],
    "Corporate Finance": ["portfolio_diversification", "valuation", "finance", "business", "career"],
    "Personal Finance": ["budgeting", "credit_score", "finance", "lifestyle", "career"],
    "Stock Market Investing": ["nepse", "mutual_funds", "dividend_stocks", "nepal", "finance", "business", "career"],
    "Macroeconomics": ["gdp", "inflation", "fiscal_policy", "economics", "finance", "business"],
    "Microeconomics": ["monopoly_pricing", "oligopoly", "economics", "finance", "business"],
    "Strategic Management": ["swot_analysis", "market_penetration", "business", "career", "strategy"],
    "HR Management": ["talent_acquisition", "labor_relations", "business", "career"],
    "Startups & Entrepreneurship": ["pitch_decks", "mvp_building", "fundraising", "business", "career", "tech"],
    "Freelancing": ["client_contracts", "pricing_work", "career", "business", "lifestyle"],
    "E-commerce & Online Business": ["dropshipping", "shopify", "business", "tech", "career"],
    "Career Growth": ["salary_negotiation", "networking", "career", "business", "productivity"],
    "Real Estate & Property": ["renting_vs_buying", "property_investment", "finance", "business", "lifestyle"],

    "History of Nepal": ["lichchhavi", "malla_dynasty", "nepal", "history", "culture", "society"],
    "Nepali Culture & Festivals": ["newari_traditions", "festivals", "nepal", "culture", "history", "society", "lifestyle"],
    "Nepali Literature": ["laxmi_prasad_devkota", "muna_madan", "nepal", "literature", "culture", "history", "society"],
    "Modern English Fiction": ["george_orwell", "dystopian_fiction", "literature", "culture", "society", "english_language", "ielts_subject"],
    "World Mythology": ["archetypes", "monomyth", "oral_traditions", "mythology", "culture", "literature", "society"],
    "Philosophy": ["dualism", "empiricism", "rationalism", "philosophy", "society", "culture"],
    "Political Philosophy": ["social_contract", "separation_of_powers", "philosophy", "politics", "society", "history"],
    "Current Affairs & Politics": ["election_coverage", "geopolitics", "politics", "society", "current_events"],
    "International Law": ["sovereignty", "treaty_ratification", "law", "politics", "society"],
    "Psychology & Human Behavior": ["cognitive_bias", "habit_formation", "psychology", "health", "society", "science"],
    "Linguistics": ["syntax_trees", "phonemes", "language_learning", "language", "culture", "society", "science", "english_language", "ielts_subject", "pte_subject"],
    "Archeology": ["stratigraphy", "radiocarbon_dating", "history", "culture", "science", "society"],

    "Fitness & Strength Training": ["progressive_overload", "home_workouts", "fitness", "health", "lifestyle"],
    "Nutrition & Diet": ["macros", "meal_prep", "nutrition", "health", "lifestyle", "biology"],
    "Mental Health": ["anxiety_management", "therapy_basics", "mental_health", "health", "psychology", "lifestyle"],
    "Cooking & Recipes": ["nepali_cuisine", "baking", "nepal", "food", "lifestyle", "culture"],
    "Skincare & Grooming": ["routine_building", "skincare", "lifestyle", "health"],
    "Fashion & Style": ["wardrobe_basics", "thrifting", "fashion", "lifestyle", "style", "creative"],
    "Parenting": ["screen_time", "sleep_training", "parenting", "lifestyle", "family", "health"],
    "Relationships & Dating": ["communication_tips", "breakup_recovery", "relationships", "lifestyle", "psychology"],
    "Productivity": ["time_blocking", "deep_work", "study_techniques", "productivity", "lifestyle", "career", "exam_prep"],

    "Adventure Tourism": ["everest_base_camp", "annapurna_circuit", "nepal", "travel", "adventure", "tourism"],
    "Cultural Tourism": ["lumbini", "pashupatinath", "nepal", "travel", "culture", "tourism", "history"],
    "Budget Travel": ["flight_deals", "backpacking", "travel", "tourism", "lifestyle"],
    "Sports Science": ["biomechanics", "aerobic_threshold", "sports", "science", "fitness", "health"],
    "Football (Soccer)": ["tactics", "transfer_news", "sports", "entertainment", "football"],
    "Cricket Analytics": ["batting_technique", "ipl_analysis", "sports", "entertainment", "cricket", "data"],
    "Gaming & Esports": ["speedrunning", "esports_tournaments", "gaming", "entertainment", "tech"],
    "Cinema Studies": ["cinematography", "screenplay_structure", "cinema", "entertainment", "media", "art", "creative"],
    "Music Theory & Production": ["harmonic_progression", "beat_making", "music", "entertainment", "art", "creative"],
    "Photography": ["camera_settings", "composition_rules", "photography", "art", "creative", "media"],

    "IOE Entrance Exam": ["engineering_entrance", "exam_prep", "nepal", "ioe_subject", "physics", "chemistry", "math", "education"],
    "CEE Exam": ["medical_entrance", "exam_prep", "nepal", "cee_subject", "biology", "physics", "chemistry", "education"],
    "NEET Exam": ["medical_entrance", "exam_prep", "neet_subject", "biology", "physics", "chemistry", "education"],
    "IELTS Preparation": ["english_proficiency", "exam_prep", "ielts_subject", "english_language", "study_abroad", "education"],
    "PTE Preparation": ["english_proficiency", "exam_prep", "pte_subject", "english_language", "study_abroad", "education"],
}

# --- NEW: sanity check — every TOPIC_BANK topic must have matching tags, and vice versa ---
missing_tags = [t for t in TOPIC_BANK if t not in TOPIC_TAGS]
extra_tags = [t for t in TOPIC_TAGS if t not in TOPIC_BANK]
print(f"⚠️ Missing from TOPIC_TAGS: {missing_tags}" if missing_tags else "✅ All TOPIC_BANK topics have tags")
print(f"⚠️ Orphan tags (no matching topic): {extra_tags}" if extra_tags else "✅ No orphan tag entries")

# --- NEW: save topic_tags as its own CSV — read later in Step 4, never mixed into content_text ---
df_topic_tags = pd.DataFrame([{'topic': t, 'tags': '|'.join(tags)} for t, tags in TOPIC_TAGS.items()])
df_topic_tags.to_csv('knova_topic_tags.csv', index=False)
print(f"✅ knova_topic_tags.csv saved: {len(df_topic_tags)} topics, "
      f"{df_topic_tags['tags'].apply(lambda x: len(x.split('|'))).mean():.1f} avg tags/topic")

TOPICS_LIST = list(TOPIC_BANK.keys())  # includes Java/C/MERN/exam topics now

CONTENT_TYPES = {
    'text_content': 0.15,
    'short_note': 0.30,
    'mcq': 0.25,
    'flashcard': 0.30
}


# 3. GENERATE USERS (2,000)

print(f"Generating {N_USERS} users...")

users_data = []
for i in range(N_USERS):
    name = fake.name()
    n_interests = np.random.randint(2, 6)
    user_interests = random.sample(TOPICS_LIST, n_interests)
    primary_interest = user_interests[0]

    base_skill = np.random.beta(2, 2) * 0.9 + 0.05  # Beta distribution for wider skill range

    curiosity_score = np.random.uniform(0.5, 1.0)
    n_interactions = int(np.random.normal(loc=40, scale=15) * curiosity_score)
    n_interactions = max(15, min(n_interactions, 85))

    users_data.append({
        'user_id': i + 1,
        'name': name,
        'interests': "|".join(user_interests),
        'primary_topic': primary_interest,
        'base_skill_level': round(base_skill, 3),
        'curiosity_score': round(curiosity_score, 3),
        'total_expected_interactions': n_interactions
    })

df_users = pd.DataFrame(users_data)


# CREATOR SETUP (Specialized Creators)

N_CREATORS = 700
creator_ids = df_users['user_id'].sample(N_CREATORS, random_state=42).tolist()

creator_specialty_map = {}
for cid in creator_ids:
    n_specialties = np.random.randint(1, 4)  # 1 to 3 niche topics
    specialties = random.sample(TOPICS_LIST, n_specialties)
    creator_specialty_map[cid] = specialties

print(f"✅ Assigned {N_CREATORS} creators with specialty topics")

creator_activity = np.random.pareto(a=3.0, size=N_CREATORS) + 0.1  # most post rarely, a few post a lot

max_share = 0.02  # cap any single creator's share of total activity at 2%
creator_activity = np.minimum(creator_activity, np.quantile(creator_activity, 0.999))
creator_weights = creator_activity / creator_activity.sum()
creator_weights = np.minimum(creator_weights, max_share)
creator_weights = creator_weights / creator_weights.sum()

creator_weight_map = dict(zip(creator_ids, creator_weights))

N_DORMANT = int(N_CREATORS * 0.15)  # 15% registered but never posted
dormant_creators = set(random.sample(creator_ids, N_DORMANT))
for cid in dormant_creators:
    creator_weight_map[cid] = 0.0

active_weights = np.array([creator_weight_map[cid] for cid in creator_ids])
active_weights = active_weights / active_weights.sum()


# 2. SMART CONTENT GENERATION FUNCTIONS

def generate_published_at(content_idx):
    days_ago = min(np.random.geometric(p=0.15), 30)  # skewed toward recent
    hours_ago = np.random.uniform(0, 24)
    minutes_ago = np.random.uniform(0, 60)
    published = datetime.now() - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
    return published.strftime('%Y-%m-%d %H:%M:%S')

def generate_mcq(topic):
    keywords = TOPIC_BANK[topic]
    k_sample = random.sample(keywords, min(4, len(keywords)))
    k1, k2 = k_sample[0], k_sample[1]
    k3 = k_sample[2] if len(k_sample) > 2 else k1
    k4 = k_sample[3] if len(k_sample) > 3 else k2
    patterns = [
        f"Which of the following best describes {k1} in the context of {topic}?",
        f"How does {k1} influence {k2}?",
        f"What is the primary function of {k1}?",
        f"In {topic}, which principle explains {k1}?"
    ]
    question = random.choice(patterns)
    correct_answer = f"It directly relates to {k2} and determines {k3}."
    distractors = [
        f"It is unrelated to {k2} but affects {k4}.",
        f"It only applies when {k3} is zero.",
        f"It is a deprecated concept in modern {topic}."
    ]
    options = [correct_answer] + distractors
    random.shuffle(options)
    return {
        'description': question,
        'options': str(options),
        'correct_index': options.index(correct_answer),
        'explanation': f"{k1} is fundamental because it governs {k2}.",
        'word_count': len(question.split()) + sum(len(o.split()) for o in options)
    }

def generate_flashcard(topic):
    keywords = TOPIC_BANK[topic]
    k1, k2 = random.sample(keywords, min(2, len(keywords)))
    front = f"Define {k1}."
    back = f"{k1} refers to the process of {k2} within {topic}."
    return {'front_desc': front, 'back_desc': back, 'word_count': len(front.split()) + len(back.split())}

def generate_short_note(topic):
    keywords = TOPIC_BANK[topic]
    k1, k2, k3 = random.sample(keywords, min(3, len(keywords)))
    content = f"**Key Insight:** {k1} is essential for mastering {topic}. Note that {k2} often interacts with {k3}."
    return {'description': content, 'word_count': len(content.split())}

def generate_text_content(topic):
    keywords = TOPIC_BANK[topic]
    k1, k2, k3 = random.sample(keywords, min(3, len(keywords)))
    title = f"Deep Dive: Understanding {k1} in {topic}"
    body = f"In the field of {topic}, {k1} stands out as a pivotal concept. Researchers have long studied how {k1} influences {k2}. Recent advancements suggest that integrating {k3} can lead to significant improvements."
    return {'title': title, 'description': body, 'word_count': len(title.split()) + len(body.split())}


# ==========================================
# 4. GENERATE CONTENT (10,000)
# ==========================================
print(f"Generating {N_CONTENT} content items...")

content_data = []
type_keys = list(CONTENT_TYPES.keys())
type_probs = list(CONTENT_TYPES.values())

for i in range(N_CONTENT):
    ctype = np.random.choice(type_keys, p=type_probs)

    creator_id = np.random.choice(creator_ids, p=active_weights)
    specialties = creator_specialty_map[creator_id]

    if random.random() < 0.8:  # 80%: post within specialty, 20%: explore
        topic = random.choice(specialties)
    else:
        topic = np.random.choice(TOPICS_LIST)

    difficulty = np.random.uniform(0.2, 0.95)

    if ctype == 'mcq':
        gen = generate_mcq(topic)
        row = {
            'content_id': i + 1, 'type': ctype, 'topic': topic,
            'difficulty_score': round(difficulty, 3), 'word_count': gen['word_count'],
            'title': None, 'description': gen['description'],
            'front_desc': None, 'back_desc': None,
            'options': gen['options'], 'correct_index': gen['correct_index'],
            'explanation': gen['explanation'], 'flip_threshold_sec': None,
            'creator_id': creator_id, 'published_at': generate_published_at(i)
        }
    elif ctype == 'flashcard':
        gen = generate_flashcard(topic)
        row = {
            'content_id': i + 1, 'type': ctype, 'topic': topic,
            'difficulty_score': round(difficulty, 3), 'word_count': gen['word_count'],
            'title': None, 'description': None,
            'front_desc': gen['front_desc'], 'back_desc': gen['back_desc'],
            'options': None, 'correct_index': None, 'explanation': None,
            'flip_threshold_sec': round(np.random.uniform(3, 8), 2),
            'creator_id': creator_id, 'published_at': generate_published_at(i)
        }
    elif ctype == 'short_note':
        gen = generate_short_note(topic)
        row = {
            'content_id': i + 1, 'type': ctype, 'topic': topic,
            'difficulty_score': round(difficulty, 3), 'word_count': gen['word_count'],
            'title': None, 'description': gen['description'],
            'front_desc': None, 'back_desc': None,
            'options': None, 'correct_index': None, 'explanation': None,
            'flip_threshold_sec': None,
            'creator_id': creator_id, 'published_at': generate_published_at(i)
        }
    elif ctype == 'text_content':
        gen = generate_text_content(topic)
        row = {
            'content_id': i + 1, 'type': ctype, 'topic': topic,
            'difficulty_score': round(difficulty, 3), 'word_count': gen['word_count'],
            'title': gen['title'], 'description': gen['description'],
            'front_desc': None, 'back_desc': None,
            'options': None, 'correct_index': None, 'explanation': None,
            'flip_threshold_sec': None,
            'creator_id': creator_id, 'published_at': generate_published_at(i)
        }

    expected_time = (row['word_count'] / 220) * 60 * (1 + difficulty * 0.5)
    row['expected_read_time_sec'] = round(expected_time, 2)
    content_data.append(row)

df_content = pd.DataFrame(content_data)

# ==========================================
# 5. GENERATE FOLLOWS TABLE
# ==========================================
follows_data = []
for _, user in df_users.iterrows():
    uid = user['user_id']
    user_interests = set(user['interests'].split('|'))

    matching_creators = [
        cid for cid in creator_ids
        if cid != uid and set(creator_specialty_map[cid]) & user_interests
    ]
    other_creators = [cid for cid in creator_ids if cid != uid and cid not in matching_creators]

    n_follows = np.random.randint(1, 8)
    n_matched = min(len(matching_creators), int(n_follows * 0.75))  # mostly follow relevant creators
    n_random = n_follows - n_matched

    followed = (
        random.sample(matching_creators, n_matched) if n_matched > 0 else []
    ) + (
        random.sample(other_creators, min(n_random, len(other_creators))) if n_random > 0 else []
    )

    for cid in followed:
        follows_data.append({'user_id': uid, 'creator_id': cid})

df_follows = pd.DataFrame(follows_data)
df_follows.to_csv('knova_follows.csv', index=False)
print(f"✅ Generated {len(df_follows)} follow relationships")

# ==========================================
# 6. GENERATE INTERACTIONS (Balanced Telemetry + Flip Logic)
# ==========================================
print("Simulating balanced telemetry interactions...")

interactions_data = []
user_interaction_list = []
for _, user in df_users.iterrows():
    for _ in range(user['total_expected_interactions']):
        user_interaction_list.append(user)

df_user_events = pd.DataFrame(user_interaction_list)
N_TOTAL_EVENTS = len(df_user_events)
df_content_events = df_content.sample(n=N_TOTAL_EVENTS, replace=True).reset_index(drop=True)

follows_lookup = df_follows.groupby('user_id')['creator_id'].apply(set).to_dict()

for idx in tqdm(range(N_TOTAL_EVENTS), desc="Generating Telemetry"):
    user = df_user_events.iloc[idx]
    content = df_content_events.iloc[idx]

    user_interests = user['interests'].split('|')
    is_interest_match = 1 if content['topic'] in user_interests else 0

    if content['topic'] == user['primary_topic']:
        effective_skill = user['base_skill_level'] * 1.1
    elif is_interest_match:
        effective_skill = user['base_skill_level']
    else:
        effective_skill = user['base_skill_level'] * 0.8
    effective_skill = min(effective_skill, 0.99)
    gap = content['difficulty_score'] - effective_skill

    persona = np.random.choice(
        ['skimmer', 'passive', 'engaged', 'deep_learner'],
        p=[0.28, 0.17, 0.30, 0.25]
    )

    if random.random() < 0.15:  # 15% skip chance
        dwell_ratio = np.random.uniform(0.05, 0.25)
        skipped = True
    else:
        skipped = False
        if persona == 'skimmer':
            dwell_ratio = np.random.uniform(0.1, 0.5)
        elif persona == 'passive':
            dwell_ratio = np.random.uniform(0.3, 0.65)
        elif persona == 'engaged':
            base = np.random.uniform(0.6, 1.1)
            dwell_ratio = base * (0.75 if gap > 0.3 else 1.0)
        else:  # deep_learner
            base = np.random.uniform(0.9, 1.8)
            dwell_ratio = base * (0.80 if gap < -0.3 else 1.0)

    dwell_ratio = max(0.1, dwell_ratio)
    actual_dwell_sec = max(1.0, content['expected_read_time_sec'] * dwell_ratio)

    quiz_success_prob = 0.9 - (gap * 0.8)
    quiz_success_prob = max(0.1, min(0.99, quiz_success_prob))
    did_quiz = 1 if content['type'] == 'mcq' and not skipped else 0
    quiz_correct = 1 if (did_quiz and random.random() < quiz_success_prob) else 0

    is_deep_engagement = (dwell_ratio > 0.8)
    upvote = 0
    if is_deep_engagement:
        if quiz_correct == 1 and random.random() > 0.35:
            upvote = 1
        elif is_interest_match == 1 and dwell_ratio > 1.0 and random.random() > 0.45:
            upvote = 1
        elif random.random() > 0.82:
            upvote = 1

    downvote = 1 if (dwell_ratio < 0.25 and random.random() > 0.75) else 0

    creator_followed = 1 if content['creator_id'] in follows_lookup.get(user['user_id'], set()) else 0

    card_flipped = 0
    flip_time_sec = 0.0
    if content['type'] == 'flashcard' and not skipped:
        if persona == 'deep_learner':   flip_bias = 0.85
        elif persona == 'engaged':      flip_bias = 0.65
        elif persona == 'passive':      flip_bias = 0.35
        else:                           flip_bias = 0.15

        gap_flip_prob = max(0.15, min(0.92, 0.75 - (gap * 0.4)))
        flip_prob = gap_flip_prob * 0.6 + flip_bias * 0.4
        card_flipped = 1 if random.random() < flip_prob else 0

        if card_flipped:
            dwell_ratio *= np.random.uniform(1.1, 1.5)
        else:
            if dwell_ratio <= 0.8:
                dwell_ratio *= np.random.uniform(0.5, 0.8)

        dwell_ratio = max(0.1, dwell_ratio)
        actual_dwell_sec = max(1.0, content['expected_read_time_sec'] * dwell_ratio)

        if card_flipped:
            flip_time_sec = round(max(2.0, actual_dwell_sec * np.random.uniform(0.35, 0.55)), 2)

    engagement_score = (upvote * 0.3) + (quiz_correct * 0.3) + (min(dwell_ratio, 1.5)/1.5 * 0.2) + (is_interest_match * 0.2)

    interactions_data.append({
        'user_id': user['user_id'],
        'content_id': content['content_id'],
        'creator_id': content['creator_id'],
        'topic': content['topic'],
        'is_interest_match': is_interest_match,
        'creator_followed': creator_followed,
        'difficulty_gap': round(gap, 3),
        'dwell_ratio_actual': round(dwell_ratio, 3),
        'actual_dwell_sec': round(actual_dwell_sec, 2),
        'did_quiz': did_quiz,
        'quiz_correct': quiz_correct,
        'upvote': upvote,
        'downvote': downvote,
        'engagement_score': round(engagement_score, 3),
        'card_flipped': card_flipped,
        'flip_time_sec': flip_time_sec
    })

df_interactions = pd.DataFrame(interactions_data)

# ==========================================
# 7. SAVE & VISUALIZE
# ==========================================
print("Saving datasets...")
df_users.to_csv('knova_users.csv', index=False)
df_content.to_csv('knova_content.csv', index=False)
df_follows.to_csv('knova_follows.csv', index=False)
df_interactions.to_csv('knova_interactions.csv', index=False)

print("✅ Generation Complete!")
print(f"Users: {len(df_users)}, Content: {len(df_content)}, Interactions: {len(df_interactions)}, Topics: {len(TOPICS_LIST)}")

plt.style.use('seaborn-v0_8')
fig, axs = plt.subplots(2, 3, figsize=(18, 10))

axs[0, 0].pie(df_content['type'].value_counts(), labels=df_content['type'].value_counts().index, autopct='%1.1f%%')
axs[0, 0].set_title('Content Type Distribution')

sns.histplot(df_interactions['dwell_ratio_actual'], bins=50, kde=True, ax=axs[0, 1], color='skyblue')
axs[0, 1].axvline(x=1.0, color='green', linestyle='--', label='Expected')
axs[0, 1].axvline(x=0.8, color='orange', linestyle=':', label='Deep Engagement Threshold')
axs[0, 1].set_title('Dwell Ratio (Target >0.8: 30-35%)')
axs[0, 1].legend()

sample = df_interactions.sample(1000)
sns.scatterplot(data=sample, x='creator_followed', y='upvote', alpha=0.5, ax=axs[0, 2])
axs[0, 2].set_title('Upvote vs Creator Follow (Should be scattered)')

sns.histplot(df_interactions['engagement_score'], bins=30, kde=True, ax=axs[1, 0], color='orange')
axs[1, 0].set_title('Engagement Score Distribution')

df_quiz = df_interactions[df_interactions['did_quiz']==1]
sns.boxenplot(data=df_quiz, x='quiz_correct', y='difficulty_gap', ax=axs[1, 1], palette="Set2")
axs[1, 1].set_title('Difficulty Gap vs Quiz Success')

corr_cols = ['dwell_ratio_actual', 'upvote', 'downvote', 'creator_followed', 'quiz_correct', 'difficulty_gap']
corr_matrix = df_interactions[corr_cols].corr()
sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', vmin=-1, vmax=1, ax=axs[1, 2], fmt=".2f")
axs[1, 2].set_title('Signal Correlations')

plt.tight_layout()
plt.show()

creator_content_counts = df_content['creator_id'].value_counts()
n_zero_content = N_CREATORS - len(creator_content_counts)
print(f"\nCreators with 0 content: {n_zero_content} ({n_zero_content/N_CREATORS:.1%})")
print(f"Top 5 most active creators:\n{creator_content_counts.head()}")
print(f"Median content per creator: {creator_content_counts.median()}")

if creator_ids:
    sample_creator = creator_ids[0]
    creator_posts = df_content[df_content['creator_id'] == sample_creator]
    print(f"Creator {sample_creator} specialties: {creator_specialty_map.get(sample_creator, 'Not Found')}")
    print(f"Topics they actually posted: ")
    if not creator_posts.empty:
        print(creator_posts['topic'].value_counts())
    else:
        print("No content posted by this creator.")
else:
    print("No creators generated to sample.")

dwell_high_rate = (df_interactions['dwell_ratio_actual'] > 0.8).mean()
upvote_rate = df_interactions['upvote'].mean()
downvote_rate = df_interactions['downvote'].mean()
follow_upvote_corr = df_interactions['upvote'].corr(df_interactions['creator_followed'])

fc_interactions = df_interactions[
    df_interactions['content_id'].isin(
        df_content[df_content['type']=='flashcard']['content_id']
    )
]
flip_rate = fc_interactions['card_flipped'].mean()
avg_flip_time = fc_interactions[fc_interactions['card_flipped']==1]['flip_time_sec'].mean()

print(f"\n🔍 Diagnostics:")
print(f"   Dwell > 0.8 Rate:      {dwell_high_rate:.1%} (Target: 30-35%)")
print(f"   Upvote Rate:           {upvote_rate:.1%} (Target: 10-14%)")
print(f"   Downvote Rate:         {downvote_rate:.1%} (Target: 5-7%)")
print(f"   Corr(Follow, Upvote):  {follow_upvote_corr:.2f} (Target: < 0.50)")
print(f"   Flashcard Flip Rate:   {flip_rate:.1%} (Target: 45-65%)")
print(f"   Avg Flip Time:         {avg_flip_time:.2f}s (Target: 2.0-5.0s)")
print(f"\n📌 New topics added: Java Programming, C Programming, MERN Stack, IOE Entrance Exam, CEE Exam, NEET Exam, IELTS Preparation, PTE Preparation")
print(f"📌 knova_topic_tags.csv is a separate artifact — required by Step 4 for tag_similarity, does not affect content_text")