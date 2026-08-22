"""Knowledge base — technology & computing topics.

Each topic maps to:
  terms: {concept: predicate phrase completing "<Concept> is <phrase>."}
  facts: standalone true sentences used in notes/articles/explanations.

All wording must remain factually correct when composed into sentences.
"""

KB_TECH = {
    "DBMS": {
        "terms": {
            "SQL": "the standard language for storing, querying and updating data in relational databases",
            "Indexing": "a technique that uses auxiliary data structures such as B-trees to find rows without scanning the whole table",
            "ACID properties": "the four guarantees of reliable transactions: atomicity, consistency, isolation and durability",
            "Normalization": "the process of organizing tables to reduce redundancy and prevent update anomalies",
            "NoSQL": "a family of databases that trade strict relational schemas for flexibility and horizontal scale",
            "Primary Key": "a column, or set of columns, whose values uniquely identify each row of a table",
            "Foreign Key": "a column that references the primary key of another table to enforce referential integrity",
        },
        "facts": [
            "A primary key can never contain NULL values, because every row must be uniquely identifiable.",
            "Without an index, most databases answer a filtered query with a full table scan.",
            "Atomicity guarantees that a transaction either completes entirely or has no effect at all.",
            "Denormalization deliberately reintroduces redundancy, usually to speed up read-heavy workloads.",
        ],
    },
    "Software Engineering": {
        "terms": {
            "SDLC": "the structured lifecycle of planning, building, testing and maintaining software",
            "Agile/Scrum": "an iterative delivery approach where small increments ship in short cycles called sprints",
            "Version control": "a system such as Git that records every change to a codebase so history can be traced and restored",
            "Code reviews": "the practice of teammates reading each other's changes before they merge, to catch defects early",
            "Design patterns": "reusable, named solutions to problems that recur in software design",
            "Technical debt": "the future cost created by choosing a quick solution now instead of a cleaner one",
            "Unit testing": "testing the smallest testable pieces of a program in isolation from the rest of the system",
        },
        "facts": [
            "The cost of fixing a defect grows dramatically the later it is found in the lifecycle.",
            "A sprint in Scrum is a fixed-length iteration, typically one to four weeks long.",
            "Design patterns describe intent and structure, not ready-made code.",
            "Continuous integration merges each developer's work frequently and verifies it with automated builds.",
        ],
    },
    "Programming Fundamentals": {
        "terms": {
            "Python": "a high-level, dynamically typed programming language prized for readable syntax and a rich library ecosystem",
            "JavaScript": "the programming language of the web browser, also widely used on servers through Node.js",
            "OOP": "a paradigm that organizes code into classes and objects which bundle state together with behavior",
            "Recursion": "a technique where a function solves a problem by calling itself on smaller inputs until a base case is reached",
            "Memory management": "the allocation and release of memory a program needs while it runs",
            "Loop": "a control structure that repeats a block of code until a condition is met",
            "Variable": "a named location that stores a value which can change while the program runs",
        },
        "facts": [
            "Every valid recursive function needs a base case, otherwise it never terminates.",
            "In Python, indentation is not just style; it defines the block structure of the code.",
            "Encapsulation hides an object's internal state and exposes only controlled ways to modify it.",
            "A stack overflow happens when recursion grows deeper than the call stack allows.",
        ],
    },
    "Web Development": {
        "terms": {
            "React": "a JavaScript library for building user interfaces out of reusable, state-driven components",
            "Next.js": "a React framework that adds routing, server rendering and static generation on top of React",
            "REST APIs": "HTTP interfaces where resources are addressed by URLs and manipulated with standard methods like GET and POST",
            "CSS layouts": "techniques such as Flexbox and Grid that position elements on a web page",
            "Full-stack projects": "applications spanning a frontend interface, a backend server and a database",
            "HTTP status codes": "three-digit responses like 200, 404 and 500 that tell the client how a request ended",
            "Web accessibility": "designing pages so people with disabilities can perceive, navigate and operate them",
        },
        "facts": [
            "A GET request should retrieve data without changing anything on the server.",
            "React components re-render when their state or props change.",
            "Flexbox lays out items along a single axis, while Grid arranges them in rows and columns.",
            "Server-side rendering sends fully formed HTML to the browser, which improves first-load performance.",
        ],
    },
    "Mobile App Development": {
        "terms": {
            "Flutter": "Google's UI toolkit for compiling a single Dart codebase to native mobile, web and desktop apps",
            "React Native": "a framework that renders real native UI components using JavaScript and React",
            "App Store guidelines": "the review rules Apple and Google enforce before an app can be published",
            "Push notifications": "messages a server delivers to a device even when the app is not running",
            "State management": "the discipline of tracking and updating the data an app's interface depends on",
            "Responsive layout": "an interface that adapts gracefully to different screen sizes and orientations",
        },
        "facts": [
            "Flutter draws its own widgets with the Skia graphics engine instead of calling platform UI kits directly.",
            "Push notifications travel through platform services such as APNs or Firebase Cloud Messaging.",
            "Both app stores reject apps that crash, mishandle permissions, or mislead users.",
            "Hot reload lets developers see code changes on a device almost instantly without losing app state.",
        ],
    },
    "Machine Learning": {
        "terms": {
            "Supervised learning": "training a model on labeled examples so it can predict outputs for new inputs",
            "Regression": "predicting a continuous numeric value, such as a price or temperature",
            "Decision trees": "models that split data through a series of if-then questions learned from the training set",
            "LightGBM": "a gradient-boosting framework that trains fast tree ensembles with histogram-based splits",
            "LLMs": "large language models, transformers trained on massive text corpora to predict and generate language",
            "Overfitting": "when a model memorizes training noise and fails to generalize to unseen data",
            "Cross-validation": "evaluating a model across multiple train/test splits to estimate how it generalizes",
        },
        "facts": [
            "Overfitting shows up as high training accuracy paired with poor validation accuracy.",
            "Gradient boosting builds trees one after another, each correcting the errors of the ensemble so far.",
            "Regularization adds a penalty for model complexity to discourage overfitting.",
            "Data leakage occurs when information unavailable at prediction time sneaks into training features.",
        ],
    },
    "Computer Vision": {
        "terms": {
            "Convolutional layers": "neural network layers that slide small filters over an image to detect local patterns like edges",
            "Image segmentation": "partitioning an image so every pixel belongs to a labeled object or region",
            "Edge detection": "locating sharp intensity changes that mark object boundaries in an image",
            "OpenCV": "an open-source library providing classic vision algorithms and image processing primitives",
            "Object detection": "locating objects in an image and classifying each one with a bounding box",
            "Pooling": "downsampling feature maps to reduce their size while keeping the strongest activations",
        },
        "facts": [
            "Early convolutional layers respond to simple edges and textures, while deeper layers respond to complex shapes.",
            "Segmentation answers 'which pixels belong to this object', whereas detection only draws bounding boxes.",
            "The Sobel operator approximates image gradients to highlight edges.",
            "Convolutions share weights across all positions in an image, drastically reducing parameters.",
        ],
    },
    "Cybersecurity": {
        "terms": {
            "Phishing scams": "fraudulent messages that impersonate trusted parties to steal credentials or money",
            "Password managers": "tools that generate and store strong unique passwords behind one master credential",
            "VPNs": "virtual private networks that tunnel traffic through an encrypted connection to hide it from local networks",
            "Ethical hacking": "authorized penetration testing that finds vulnerabilities before attackers do",
            "Encryption": "transforming data so only holders of the right key can read it",
            "Two-factor authentication": "requiring a second proof of identity, such as a one-time code, beyond the password",
            "Malware": "malicious software designed to damage, spy or extort, including viruses, ransomware and spyware",
        },
        "facts": [
            "Reusing the same password across sites means one breach compromises many accounts.",
            "HTTPS encrypts web traffic between the browser and the server using TLS.",
            "Social engineering attacks exploit human trust rather than technical flaws.",
            "A VPN hides traffic from the local network but does not make a malicious website trustworthy.",
        ],
    },
    "Cloud Computing": {
        "terms": {
            "AWS basics": "Amazon Web Services, the largest cloud platform, offering on-demand compute, storage and managed services",
            "Docker": "a tool that packages an application with its dependencies into portable containers",
            "Kubernetes": "an orchestrator that schedules, scales and heals containerized workloads across clusters",
            "Serverless functions": "event-triggered code that runs on demand without managing any servers",
            "CI/CD": "automated pipelines that build, test and deploy software on every change",
            "Object storage": "durability-focused storage for files and blobs, accessed over an API, such as Amazon S3",
            "Autoscaling": "automatically adding or removing compute capacity based on load",
        },
        "facts": [
            "Containers isolate processes with kernel features like namespaces and cgroups.",
            "Cloud billing is typically usage-based, so idle capacity costs less than dedicated hardware.",
            "Kubernetes restarts containers that fail health checks, following its declared desired state.",
            "Infrastructure as code manages cloud resources through versioned configuration files.",
        ],
    },
    "Data Analysis": {
        "terms": {
            "Excel formulas": "spreadsheet expressions such as SUM, VLOOKUP and IF that compute values from cell references",
            "SQL queries": "SELECT statements that filter, join and aggregate tables in a relational database",
            "Dashboards": "visual panels of charts and KPIs that summarize data for monitoring at a glance",
            "Power BI": "Microsoft's business intelligence tool for modeling data and publishing interactive reports",
            "Data cleaning": "fixing missing values, duplicates and inconsistent formats before analysis",
            "Correlation": "a statistical measure between -1 and 1 showing how strongly two variables move together",
            "Outlier": "a data point far from the rest of the distribution, often caused by error or rare events",
        },
        "facts": [
            "Correlation does not imply causation; a third factor may drive both variables.",
            "Analysts spend a large share of project time cleaning data rather than modeling it.",
            "Pivot tables summarize large datasets by grouping and aggregating without formulas.",
            "Reporting averages alone hides skew; medians and distributions tell a fuller story.",
        ],
    },
    "AI": {
        "terms": {
            "Artificial Intelligence": "the broad field of building systems that perform tasks normally requiring human intelligence",
            "Machine learning": "the subset of AI where systems improve at tasks by learning patterns from data",
            "Neural networks": "layered models of connected units whose weights are tuned during training",
            "Natural language processing": "the branch of AI that lets computers analyze and generate human language",
            "Automation": "using software or machines to carry out repetitive tasks with minimal human input",
            "Expert systems": "early AI programs that encoded specialist knowledge as explicit if-then rules",
            "Reinforcement learning": "training agents to act by rewarding outcomes and penalizing mistakes over time",
        },
        "facts": [
            "Machine learning is a subset of artificial intelligence, not a rival approach.",
            "Modern language models learn from data patterns rather than hand-written rules.",
            "An AI system is only as good as the data it learns from; biased data yields biased behavior.",
            "Reinforcement learning agents learn purely from feedback signals, not labeled examples.",
        ],
    },
    "Discrete Mathematics": {
        "terms": {
            "Graph theory": "the study of vertices connected by edges, used to model networks of every kind",
            "Set theory": "the study of unordered collections of distinct elements and operations like union and intersection",
            "Combinatorics": "the mathematics of counting, arranging and selecting objects",
            "Boolean algebra": "algebra over true and false values with operations AND, OR and NOT",
            "Permutation": "an ordered arrangement of objects where order matters",
            "Combination": "a selection of objects where order does not matter",
            "Proof by induction": "showing a statement holds for a base case and that holding for n implies holding for n+1",
            "Pigeonhole principle": "if more items go into fewer boxes, some box must hold more than one item",
            "Tree": "a connected graph with no cycles, containing exactly n-1 edges for n vertices",
            "Relation": "a set of ordered pairs describing how elements of one set relate to those of another",
        },
        "facts": [
            "A graph with n vertices can have at most n(n-1)/2 edges when edges are undirected.",
            "Induction proves infinitely many cases using only two steps: base case and inductive step.",
            "The number of k-combinations from n items is written C(n, k) and equals n!/(k!(n-k)!).",
            "Every finite tree with at least two vertices has at least two leaves.",
        ],
    },
    "Cryptocurrency & Web3": {
        "terms": {
            "Bitcoin basics": "the first decentralized cryptocurrency, secured by proof-of-work mining on a public ledger",
            "Wallet security": "protecting the private keys that control crypto funds, using practices like hardware wallets and backups",
            "Smart contracts": "self-executing programs on a blockchain that run exactly as written without intermediaries",
            "Blockchain explained": "a distributed append-only ledger replicated across many nodes so records cannot be quietly altered",
            "Private key": "the secret cryptographic key that authorizes spending from a crypto address",
            "Consensus mechanism": "the protocol, such as proof-of-work or proof-of-stake, by which nodes agree on the ledger",
        },
        "facts": [
            "Anyone who obtains your private key controls your funds; losing it means losing access permanently.",
            "Ethereum switched from proof-of-work to proof-of-stake in 2022, cutting its energy use dramatically.",
            "Transactions on a public blockchain are pseudonymous, visible to anyone, not anonymous by default.",
            "Immutability means entries are effectively permanent, so mistakes cannot simply be edited away.",
        ],
    },
    "Java Programming": {
        "terms": {
            "OOP in Java": "class-based object orientation with inheritance, interfaces and access modifiers",
            "JVM internals": "how the Java Virtual Machine loads bytecode, verifies it and executes it with JIT compilation",
            "Spring Boot": "an opinionated Spring setup that auto-configures production-ready Java web services",
            "Multithreading": "running several threads within one process, coordinated with synchronization",
            "Exception handling": "managing errors with try, catch and finally blocks instead of crashing",
            "Collections framework": "Java's standard data structures such as List, Set and Map with common interfaces",
            "Garbage collection": "automatic reclamation of memory occupied by objects no longer reachable",
            "Interfaces & abstract classes": "contracts and partial implementations that let unrelated types share behavior",
        },
        "facts": [
            "Java compiles to bytecode that any JVM can execute, giving the language its portability.",
            "String literals in Java are immutable, so modifying them produces new objects.",
            "HashMap provides average constant-time lookups by hashing keys into buckets.",
            "Unchecked exceptions extend RuntimeException and do not require declaration or catching.",
        ],
    },
    "C Programming": {
        "terms": {
            "Pointers": "variables holding memory addresses, enabling direct access to data and efficient passing of large structures",
            "Memory management": "manual allocation and freeing of heap memory with malloc, calloc and free",
            "Structs": "user-defined types grouping related fields of possibly different types into one record",
            "Bitwise operations": "operators like AND, OR, XOR and shifts that manipulate individual bits",
            "Header files": "files declaring functions and types so they can be shared across source files",
            "Dynamic allocation": "requesting memory at runtime whose size need not be known at compile time",
            "File handling": "reading and writing files through FILE pointers with fopen, fread and fwrite",
            "Preprocessor directives": "instructions like #define and #include processed before compilation begins",
        },
        "facts": [
            "Every malloc must be matched by exactly one free, or the program leaks memory.",
            "Dereferencing NULL or freed pointers causes undefined behavior in C.",
            "Array indexing in C is defined in terms of pointer arithmetic: a[i] means *(a+i).",
            "Strings in C are arrays of characters terminated by the null byte '\\0'.",
        ],
    },
    "MERN Stack": {
        "terms": {
            "MongoDB schemas": "document models defining collections of JSON-like records with flexible fields",
            "Express routing": "mapping HTTP paths and verbs to handler functions in an Express server",
            "React components": "reusable UI units that manage markup and behavior together",
            "Node.js event loop": "the single-threaded mechanism that lets Node handle many connections via non-blocking callbacks",
            "JWT auth": "stateless authentication using signed JSON Web Tokens carried with each request",
            "Middleware": "functions that process requests in sequence before the final route handler runs",
            "API design": "shaping endpoints, payloads and status codes so clients integrate predictably",
        },
        "facts": [
            "MERN stands for MongoDB, Express, React and Node.js.",
            "Blocking the Node.js event loop stalls every other request the server is handling.",
            "JWTs are signed, not secret: anyone can read their payload, but only the signer could create it.",
            "MongoDB stores documents in BSON, a binary form of JSON supporting richer types.",
        ],
    },
    "Computer Hardware": {
        "terms": {
            "CPU architecture": "the internal design of a processor, including cores, caches and instruction pipelines",
            "RAM types": "generations of volatile memory such as DDR4 and DDR5 differing in speed and voltage",
            "Motherboard components": "the chipset, sockets, slots and controllers connecting CPU, memory and peripherals",
            "Building a PC": "assembling compatible parts such as case, PSU, motherboard, CPU, RAM, storage and GPU",
            "GPU": "a massively parallel processor originally built for graphics, now central to gaming and AI workloads",
            "SSD vs HDD": "solid-state drives store data in flash chips with no moving parts, hard drives use spinning magnetic platters",
        },
        "facts": [
            "Cache memory sits closest to the CPU core and is orders of magnitude faster than main memory.",
            "A power supply should be chosen with headroom above the system's peak draw.",
            "DDR5 doubles the memory banks per chip compared with DDR4, improving parallelism.",
            "SSDs achieve far lower latency than HDDs because there are no mechanical seek times.",
        ],
    },
    "Electronics & Circuits": {
        "terms": {
            "Ohm's law": "the relation V = IR linking voltage, current and resistance in a circuit",
            "Breadboarding": "prototyping circuits without soldering by plugging components into a perforated board with connected strips",
            "Microcontrollers": "single-chip computers combining CPU, memory and peripherals for embedded control tasks",
            "Sensors": "devices converting physical quantities such as temperature or light into electrical signals",
            "Arduino projects": "hands-on builds using Arduino boards programmed through a simplified C++ environment",
            "Series and parallel": "two basic wiring schemes; series shares current, parallel shares voltage",
        },
        "facts": [
            "Ohm's law states that current through a resistor equals voltage across it divided by resistance.",
            "Components in series carry the same current, while components in parallel share the same voltage.",
            "A pull-up resistor holds an input pin at a defined logic level when no button is pressed.",
            "Breadboard power rails run in long strips, letting many components tap the same supply.",
        ],
    },
    "Embedded Systems": {
        "terms": {
            "Firmware": "software burned into a device's non-volatile memory that controls its low-level behavior",
            "Real-time OS": "an operating system guaranteeing responses within strict timing deadlines",
            "IoT devices": "network-connected embedded gadgets that sense and act on the physical world",
            "PCB design basics": "laying out copper traces, layers and components on a printed circuit board",
            "Interrupts": "hardware signals that pause the main program to service urgent events immediately",
            "Watchdog timer": "a timer that resets the system if firmware hangs and stops refreshing it",
        },
        "facts": [
            "Hard real-time systems fail if a deadline is missed; soft real-time systems merely degrade.",
            "Interrupt service routines should be short, deferring heavy work to the main loop.",
            "Flash memory retains firmware through power cycles, which is why updates survive reboots.",
            "Power consumption often dominates embedded design choices, favoring sleep modes and low-power states.",
        ],
    },
    "Robotics": {
        "terms": {
            "Actuators": "components such as motors and servos that convert commands into physical motion",
            "Robotic arms": "articulated manipulators with joints whose end effectors position tools precisely",
            "Path planning": "computing a collision-free route from a start pose to a goal pose",
            "ROS basics": "the Robot Operating System, a middleware of nodes, messages and tools for robot software",
            "Degrees of freedom": "the number of independent motions a robot mechanism can make",
            "SLAM": "simultaneous localization and mapping, building a map while tracking the robot's position within it",
        },
        "facts": [
            "A six-axis arm can position and orient its end effector anywhere within its workspace envelope.",
            "Forward kinematics maps joint angles to gripper position; inverse kinematics solves the reverse problem.",
            "ROS nodes communicate through typed messages over topics, services and actions.",
            "PID controllers remain the workhorse for keeping motor speed and joint position on target.",
        ],
    },
}
