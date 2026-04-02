# PHASE 3 — SEED DATA DESIGN

> **Goal:** Define the complete GATE CSE subject-topic-subtopic structure, NLP keyword tags, sample question JSON format, and the NLP preprocessing script for auto-tagging questions on insert.

---

## 1. GATE CSE Subject → Topic → Subtopics Structure

```json
{
  "subjects": [
    {
      "name": "Data Structures",
      "topics": [
        {
          "name": "Arrays and Strings",
          "subtopics": ["1D/2D Arrays", "String Matching", "Sliding Window", "Prefix Sum"],
          "nlp_tags": ["array", "string", "index", "buffer", "prefix"]
        },
        {
          "name": "Linked Lists",
          "subtopics": ["Singly Linked", "Doubly Linked", "Circular", "Floyd's Algorithm"],
          "nlp_tags": ["linked list", "pointer", "node", "cycle detection"]
        },
        {
          "name": "Stacks and Queues",
          "subtopics": ["Stack Applications", "Queue Variants", "Deque", "Priority Queue"],
          "nlp_tags": ["stack", "queue", "LIFO", "FIFO", "push", "pop"]
        },
        {
          "name": "Trees",
          "subtopics": ["Binary Tree", "BST", "AVL Tree", "Segment Tree", "Fenwick Tree"],
          "nlp_tags": ["tree", "root", "leaf", "height", "traversal", "BST", "AVL"]
        },
        {
          "name": "Heaps",
          "subtopics": ["Min Heap", "Max Heap", "Heap Sort", "Heapify"],
          "nlp_tags": ["heap", "priority", "heapify", "parent", "merge"]
        },
        {
          "name": "Hashing",
          "subtopics": ["Hash Functions", "Chaining", "Open Addressing", "Load Factor"],
          "nlp_tags": ["hash", "collision", "chaining", "probing", "load factor"]
        },
        {
          "name": "Graphs",
          "subtopics": ["BFS", "DFS", "Dijkstra", "Bellman-Ford", "Floyd-Warshall", "Topological Sort"],
          "nlp_tags": ["graph", "vertex", "edge", "BFS", "DFS", "shortest path"]
        }
      ]
    },
    {
      "name": "Algorithms",
      "topics": [
        {
          "name": "Sorting",
          "subtopics": ["Merge Sort", "Quick Sort", "Heap Sort", "Counting Sort", "Radix Sort"],
          "nlp_tags": ["sort", "comparison", "pivot", "merge", "stable sort"]
        },
        {
          "name": "Searching",
          "subtopics": ["Binary Search", "Ternary Search", "KMP", "Rabin-Karp"],
          "nlp_tags": ["search", "binary search", "pattern matching", "KMP"]
        },
        {
          "name": "Dynamic Programming",
          "subtopics": ["Memoization", "Tabulation", "LCS", "LIS", "Knapsack", "Matrix Chain"],
          "nlp_tags": ["dynamic programming", "DP", "optimal substructure", "overlapping", "knapsack"]
        },
        {
          "name": "Greedy Algorithms",
          "subtopics": ["Activity Selection", "Huffman Coding", "Fractional Knapsack", "Job Scheduling"],
          "nlp_tags": ["greedy", "optimal", "activity selection", "Huffman", "local optimum"]
        },
        {
          "name": "Divide and Conquer",
          "subtopics": ["Merge Sort", "Quick Sort", "Binary Search", "Strassen's Matrix"],
          "nlp_tags": ["divide", "conquer", "recurrence", "T(n) = 2T(n/2)"]
        },
        {
          "name": "Graph Algorithms",
          "subtopics": ["MST (Kruskal, Prim)", "Shortest Path", "SCC", "Articulation Points"],
          "nlp_tags": ["MST", "spanning tree", "Kruskal", "Prim", "Dijkstra"]
        },
        {
          "name": "Complexity Theory",
          "subtopics": ["Time Complexity", "Space Complexity", "Big-O", "P vs NP", "NP-Hard"],
          "nlp_tags": ["complexity", "Big-O", "NP", "polynomial", "reduction"]
        }
      ]
    },
    {
      "name": "Operating Systems",
      "topics": [
        {
          "name": "Process Management",
          "subtopics": ["Process States", "PCB", "Context Switching", "Fork", "Threads"],
          "nlp_tags": ["process", "PCB", "context switch", "fork", "thread", "state"]
        },
        {
          "name": "CPU Scheduling",
          "subtopics": ["FCFS", "SJF", "Round Robin", "Priority Scheduling", "MLFQ"],
          "nlp_tags": ["scheduling", "CPU", "round robin", "preemptive", "burst time", "waiting time"]
        },
        {
          "name": "Synchronization",
          "subtopics": ["Mutex", "Semaphore", "Monitor", "Producer-Consumer", "Readers-Writers"],
          "nlp_tags": ["semaphore", "mutex", "synchronization", "critical section", "deadlock"]
        },
        {
          "name": "Deadlock",
          "subtopics": ["Conditions", "Prevention", "Avoidance", "Detection", "Banker's Algorithm"],
          "nlp_tags": ["deadlock", "banker", "resource allocation", "circular wait", "safe state"]
        },
        {
          "name": "Memory Management",
          "subtopics": ["Paging", "Segmentation", "TLB", "Page Replacement", "Thrashing"],
          "nlp_tags": ["paging", "page table", "TLB", "LRU", "FIFO", "page fault", "thrashing"]
        },
        {
          "name": "File Systems",
          "subtopics": ["File Allocation", "Directory Structure", "Inode", "FAT", "Ext"],
          "nlp_tags": ["file system", "inode", "FAT", "directory", "allocation"]
        },
        {
          "name": "Disk Scheduling",
          "subtopics": ["FCFS", "SSTF", "SCAN", "C-SCAN", "LOOK"],
          "nlp_tags": ["disk", "seek time", "SSTF", "SCAN", "cylinder"]
        }
      ]
    },
    {
      "name": "DBMS",
      "topics": [
        {
          "name": "Relational Model",
          "subtopics": ["Keys", "Integrity Constraints", "Relational Algebra", "Tuple Calculus"],
          "nlp_tags": ["relation", "primary key", "foreign key", "relational algebra", "tuple"]
        },
        {
          "name": "SQL",
          "subtopics": ["DDL", "DML", "Joins", "Subqueries", "Aggregation", "Views"],
          "nlp_tags": ["SQL", "SELECT", "JOIN", "GROUP BY", "aggregate", "view"]
        },
        {
          "name": "Normalization",
          "subtopics": ["1NF", "2NF", "3NF", "BCNF", "4NF", "Functional Dependency"],
          "nlp_tags": ["normalization", "1NF", "2NF", "3NF", "BCNF", "functional dependency"]
        },
        {
          "name": "Transactions",
          "subtopics": ["ACID Properties", "Serializability", "Concurrency Control", "2PL", "MVCC"],
          "nlp_tags": ["transaction", "ACID", "atomicity", "isolation", "serializability", "2PL"]
        },
        {
          "name": "Indexing",
          "subtopics": ["B-Tree", "B+ Tree", "Hash Index", "Dense vs Sparse"],
          "nlp_tags": ["index", "B+ tree", "hash index", "clustered", "dense", "sparse"]
        }
      ]
    },
    {
      "name": "Computer Networks",
      "topics": [
        {
          "name": "Network Layers",
          "subtopics": ["OSI Model", "TCP/IP Model", "Layer Functions", "Encapsulation"],
          "nlp_tags": ["OSI", "TCP/IP", "layer", "protocol", "encapsulation"]
        },
        {
          "name": "Data Link Layer",
          "subtopics": ["Framing", "Error Detection", "CSMA/CD", "CSMA/CA", "MAC Address"],
          "nlp_tags": ["data link", "framing", "CRC", "CSMA", "MAC", "Ethernet"]
        },
        {
          "name": "Network Layer",
          "subtopics": ["IP Addressing", "Subnetting", "CIDR", "ARP", "ICMP", "Routing"],
          "nlp_tags": ["IP", "subnet", "CIDR", "routing", "ARP", "ICMP"]
        },
        {
          "name": "Transport Layer",
          "subtopics": ["TCP", "UDP", "Three-Way Handshake", "Flow Control", "Congestion Control"],
          "nlp_tags": ["TCP", "UDP", "handshake", "flow control", "congestion", "ACK"]
        },
        {
          "name": "Application Layer",
          "subtopics": ["HTTP", "DNS", "SMTP", "FTP", "DHCP", "HTTPS"],
          "nlp_tags": ["HTTP", "DNS", "SMTP", "application layer", "socket"]
        }
      ]
    },
    {
      "name": "Theory of Computation",
      "topics": [
        {
          "name": "Finite Automata",
          "subtopics": ["DFA", "NFA", "NFA to DFA", "Minimization", "Regular Languages"],
          "nlp_tags": ["DFA", "NFA", "automata", "state", "transition", "regular language"]
        },
        {
          "name": "Regular Expressions",
          "subtopics": ["RE to FA", "Pumping Lemma", "Kleene's Theorem"],
          "nlp_tags": ["regular expression", "Kleene star", "pumping lemma"]
        },
        {
          "name": "Context-Free Languages",
          "subtopics": ["CFG", "PDA", "CYK Algorithm", "Ambiguity", "CNF"],
          "nlp_tags": ["CFG", "context free", "PDA", "pushdown", "ambiguous grammar"]
        },
        {
          "name": "Turing Machines",
          "subtopics": ["TM Model", "Decidability", "Halting Problem", "Reducibility"],
          "nlp_tags": ["Turing machine", "halting", "decidable", "undecidable", "reducibility"]
        },
        {
          "name": "Complexity Classes",
          "subtopics": ["P", "NP", "NP-Complete", "NP-Hard", "Cook's Theorem"],
          "nlp_tags": ["P", "NP", "NP-complete", "polynomial time", "Cook's theorem"]
        }
      ]
    },
    {
      "name": "Compiler Design",
      "topics": [
        {
          "name": "Lexical Analysis",
          "subtopics": ["Tokens", "LEX Tool", "FA-based Lexer", "Symbol Table"],
          "nlp_tags": ["lexer", "token", "scanner", "regex", "LEX"]
        },
        {
          "name": "Syntax Analysis",
          "subtopics": ["Top-Down Parsing", "Bottom-Up Parsing", "LL(1)", "LR(0)", "SLR", "CLR", "LALR"],
          "nlp_tags": ["parser", "LL1", "LR", "SLR", "LALR", "grammar", "derivation"]
        },
        {
          "name": "Semantic Analysis",
          "subtopics": ["Type Checking", "Attribute Grammars", "Symbol Table"],
          "nlp_tags": ["semantic", "type check", "attribute grammar"]
        },
        {
          "name": "Intermediate Code",
          "subtopics": ["Three-Address Code", "Quadruples", "DAG", "SSA"],
          "nlp_tags": ["intermediate code", "three-address", "DAG", "SSA"]
        },
        {
          "name": "Code Optimization",
          "subtopics": ["Peephole", "CSE", "Constant Folding", "Loop Optimization", "Register Allocation"],
          "nlp_tags": ["optimization", "peephole", "CSE", "loop", "register allocation"]
        }
      ]
    },
    {
      "name": "Digital Logic",
      "topics": [
        {
          "name": "Boolean Algebra",
          "subtopics": ["Laws", "De Morgan's", "Karnaugh Map", "Quine-McCluskey"],
          "nlp_tags": ["boolean", "logic gate", "K-map", "SOP", "POS", "De Morgan"]
        },
        {
          "name": "Combinational Circuits",
          "subtopics": ["Multiplexer", "Demultiplexer", "Encoder", "Decoder", "Adder", "Comparator"],
          "nlp_tags": ["combinational", "MUX", "decoder", "adder", "half adder", "full adder"]
        },
        {
          "name": "Sequential Circuits",
          "subtopics": ["SR Latch", "D Flip-Flop", "JK Flip-Flop", "Registers", "Counters"],
          "nlp_tags": ["flip-flop", "latch", "sequential", "register", "counter", "state machine"]
        },
        {
          "name": "Number Systems",
          "subtopics": ["Binary", "Octal", "Hex", "2's Complement", "IEEE 754"],
          "nlp_tags": ["binary", "hexadecimal", "2's complement", "IEEE 754", "floating point"]
        }
      ]
    },
    {
      "name": "Computer Organization",
      "topics": [
        {
          "name": "CPU Architecture",
          "subtopics": ["ALU", "Control Unit", "Registers", "Instruction Cycle", "Pipeline"],
          "nlp_tags": ["ALU", "control unit", "instruction cycle", "fetch decode execute", "pipeline"]
        },
        {
          "name": "Memory Hierarchy",
          "subtopics": ["Cache", "DRAM", "SRAM", "Cache Mapping", "Write Policy"],
          "nlp_tags": ["cache", "memory hierarchy", "direct mapped", "associative", "write-back"]
        },
        {
          "name": "Instruction Set",
          "subtopics": ["RISC vs CISC", "Addressing Modes", "Instruction Formats"],
          "nlp_tags": ["RISC", "CISC", "addressing mode", "instruction format", "opcode"]
        },
        {
          "name": "I/O Organization",
          "subtopics": ["Interrupts", "DMA", "Polling", "I/O Interfaces"],
          "nlp_tags": ["interrupt", "DMA", "polling", "I/O", "bus"]
        }
      ]
    },
    {
      "name": "Discrete Mathematics",
      "topics": [
        {
          "name": "Set Theory",
          "subtopics": ["Operations", "Venn Diagrams", "Power Set", "Cartesian Product"],
          "nlp_tags": ["set", "union", "intersection", "complement", "power set"]
        },
        {
          "name": "Logic and Proofs",
          "subtopics": ["Propositional Logic", "Predicate Logic", "Inference Rules", "Proof Techniques"],
          "nlp_tags": ["propositional logic", "predicate", "modus ponens", "proof by induction"]
        },
        {
          "name": "Relations and Functions",
          "subtopics": ["Equivalence Relations", "Partial Order", "Bijection", "Composition"],
          "nlp_tags": ["relation", "function", "bijection", "equivalence", "partial order"]
        },
        {
          "name": "Graph Theory",
          "subtopics": ["Trees", "Planar Graphs", "Euler/Hamilton", "Graph Coloring", "Matching"],
          "nlp_tags": ["graph theory", "Euler", "Hamiltonian", "planar", "chromatic number"]
        },
        {
          "name": "Combinatorics",
          "subtopics": ["Permutations", "Combinations", "Pigeonhole", "Inclusion-Exclusion", "Generating Functions"],
          "nlp_tags": ["permutation", "combination", "pigeonhole", "inclusion exclusion"]
        }
      ]
    },
    {
      "name": "Aptitude",
      "topics": [
        {
          "name": "Quantitative Aptitude",
          "subtopics": ["Number System", "Ratio Proportion", "Time Work", "Probability", "Statistics"],
          "nlp_tags": ["arithmetic", "ratio", "probability", "percentage", "average"]
        },
        {
          "name": "Verbal Aptitude",
          "subtopics": ["Reading Comprehension", "Sentence Correction", "Vocabulary"],
          "nlp_tags": ["comprehension", "grammar", "vocabulary", "sentence"]
        },
        {
          "name": "Logical Reasoning",
          "subtopics": ["Syllogisms", "Puzzles", "Coding-Decoding", "Blood Relations"],
          "nlp_tags": ["logic", "syllogism", "puzzle", "reasoning", "series"]
        }
      ]
    }
  ]
}
```

---

## 2. Question JSON Structure (for seeding)

```json
{
  "questions": [
    {
      "subject": "Operating Systems",
      "topic": "CPU Scheduling",
      "subtopic": "Round Robin",
      "question_text": "In Round Robin scheduling with time quantum q=4ms, if 3 processes P1(12ms), P2(6ms), P3(8ms) arrive at t=0, what is the average waiting time?",
      "options": [
        "A. 8.33 ms",
        "B. 10.67 ms",
        "C. 6.5 ms",
        "D. 12 ms"
      ],
      "question_image_urls": ["https://example.com/pyq/os-rr-diagram-1.png", "https://example.com/pyq/os-rr-diagram-2.png"],
      "correct_answer": "A",
      "explanation": "Using Gantt Chart: P1(0-4), P2(4-8), P3(8-12), P1(12-16), P2(16-18), P3(18-22), P1(22-26). Waiting: P1=14-12=... compute systematically. Answer: 8.33ms.",
      "difficulty": "medium",
      "source_type": "PYQ",
      "year": 2022,
      "nlp_tags": ["round robin", "scheduling", "time quantum", "waiting time", "Gantt chart"]
    },
    {
      "subject": "DBMS",
      "topic": "Normalization",
      "subtopic": "BCNF",
      "question_text": "A relation R(A, B, C, D) has functional dependencies A→B, BC→D. Which normal form does R satisfy?",
      "options": [
        "A. 1NF only",
        "B. 2NF but not 3NF",
        "C. 3NF but not BCNF",
        "D. BCNF"
      ],
      "question_image_urls": [],
      "correct_answer": "C",
      "explanation": "A→B means B is dependent on part of the key (if BC is the candidate key), violating 3NF. However, BC→D is fine. R is in 3NF but not BCNF since A is not a superkey.",
      "difficulty": "hard",
      "source_type": "PYQ",
      "year": 2021,
      "nlp_tags": ["BCNF", "3NF", "functional dependency", "normalization", "candidate key"]
    },
    {
      "subject": "Algorithms",
      "topic": "Dynamic Programming",
      "subtopic": "Knapsack",
      "question_text": "What is the time complexity of the 0/1 Knapsack problem using dynamic programming with n items and weight capacity W?",
      "options": [
        "A. O(n log n)",
        "B. O(nW)",
        "C. O(n^2)",
        "D. O(2^n)"
      ],
      "question_image_urls": [],
      "correct_answer": "B",
      "explanation": "The 0/1 Knapsack DP table has n rows and W columns. Filling each cell takes O(1), so total time complexity is O(nW). This is pseudo-polynomial.",
      "difficulty": "easy",
      "source_type": "practice",
      "year": null,
      "nlp_tags": ["knapsack", "0/1 knapsack", "DP", "dynamic programming", "time complexity"]
    }
  ]
}
```

---

## 3. Seed Script (`backend/seed.py`)

```python
import json
import asyncio
from database import SessionLocal
from models.models import Subject, Topic, Question, User
from services.auth_service import hash_password

async def seed_db():
    db = SessionLocal()
    try:
        # Create admin user
        admin = User(
            email="admin@smartexamprep.com",
            hashed_password=hash_password("Admin@1234"),
            full_name="Platform Admin",
            role="admin"
        )
        db.add(admin)
        db.flush()

        # Load structure
        with open("seed_data/subjects.json") as f:
            data = json.load(f)

        for subj_data in data["subjects"]:
            subject = Subject(name=subj_data["name"])
            db.add(subject)
            db.flush()

            for topic_data in subj_data["topics"]:
                topic = Topic(
                    subject_id=subject.id,
                    name=topic_data["name"],
                    subtopics=topic_data["subtopics"],
                    nlp_keyword_tags=topic_data["nlp_tags"]
                )
                db.add(topic)

        # Load sample questions
        with open("seed_data/questions.json") as f:
            qdata = json.load(f)

        for q in qdata["questions"]:
            subject = db.query(Subject).filter_by(name=q["subject"]).first()
            topic = db.query(Topic).filter_by(
                subject_id=subject.id, name=q["topic"]
            ).first()

            question = Question(
                subject_id=subject.id,
                topic_id=topic.id,
                subtopic=q["subtopic"],
                question_text=q["question_text"],
                options=q["options"],
              question_image_urls=q.get("question_image_urls", []),
                correct_answer=q["correct_answer"],
                explanation=q["explanation"],
                difficulty=q["difficulty"],
                source_type=q["source_type"],
                year=q.get("year"),
                nlp_keyword_tags=q["nlp_tags"],
                is_verified=True,
                created_by=admin.id
            )
            db.add(question)

        db.commit()
        print("✅ Seed data inserted successfully")
    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(seed_db())
```

---

## 4. NLP Preprocessing Script (`backend/ml/nlp_pipeline.py` — tagging on insert)

```python
import spacy
from sentence_transformers import SentenceTransformer

nlp = spacy.load("en_core_web_sm")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# GATE CSE domain keyword vocabulary
GATE_KEYWORDS = {
    "process", "thread", "semaphore", "mutex", "deadlock", "paging",
    "scheduling", "cache", "TCP", "UDP", "SQL", "normalization",
    "BFS", "DFS", "heap", "BST", "DP", "NP", "automata", "grammar",
    "flip-flop", "pipeline", "interrupt", "DMA", "recursion", "pointer"
}

def extract_nlp_tags(text: str) -> list[str]:
    """
    Extract relevant GATE CSE keyword tags from question text using spaCy.
    Combines NER noun chunks with domain-specific vocabulary matching.
    """
    doc = nlp(text.lower())
    tags = set()

    # Extract noun chunks (spaCy)
    for chunk in doc.noun_chunks:
        phrase = chunk.text.strip()
        if len(phrase) > 2:
            tags.add(phrase)

    # Domain vocabulary matching
    tokens = {token.lemma_ for token in doc if not token.is_stop}
    for keyword in GATE_KEYWORDS:
        if keyword.lower() in text.lower():
            tags.add(keyword)

    return list(tags)[:10]  # Cap at 10 tags

def get_embedding(text: str) -> list[float]:
    """
    Generate sentence embedding for a question text.
    Used for semantic similarity in recommendation deduplication.
    """
    embedding = embedder.encode(text, convert_to_numpy=True)
    return embedding.tolist()

def compute_similarity(embedding1: list[float], embedding2: list[float]) -> float:
    """
    Compute cosine similarity between two embeddings.
    """
    import numpy as np
    a = np.array(embedding1)
    b = np.array(embedding2)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
```

  ---

  ## 5. PYQ Image Support Addendum

  - Include `question_image_urls` in seed question JSON objects.
  - Use `question_image_urls: []` for text-only questions.
  - For image-heavy PYQs, store one or more URLs/paths in order of appearance.
  - NLP preprocessing should optionally append OCR/caption text to `question_text` before tagging so image context is retained.
