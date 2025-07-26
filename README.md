Check out the live deployment of the project on the [Recap website](http://recap.austinjiang.com) to see it in action!

# Recap: A Memory Planning System

A full-stack AI-powered memory planning system that simulates how the human brain structures and retains knowledge — from sentences to letters — across any subject or language.

## Overview

Recap is an intelligent memory planning system designed to solve the inefficiencies of traditional learning and vocabulary tools. It builds a multi-layered knowledge graph, models memory decay over time, and uses GPT-4 to evaluate user understanding — all while offering real-time visualizations and multi-modal learning environments.

Whether you're a student, a language learner, or preparing for exams, Recap can personalize your review process and help you retain more in less time.

## Core Principles

### Layered Knowledge Structure

Recap decomposes learning content into four layers:

- Sentence layer: full sentence input
- Word layer: words extracted from the sentence
- Morpheme layer: prefixes, roots, suffixes
- Letter layer: individual characters

This layered model allows for structured memory propagation across levels, where learning at higher layers (sentences) improves retention at lower layers (words, morphemes, letters).

### Memory Decay and Spaced Repetition

Each memory node follows an exponential forgetting model:

```
retention = exp(-decay_factor / ease_factor * (now - time_last))
```

- `decay_factor` is calibrated to a 30-second half-life
- `ease_factor` dynamically adjusts based on semantic comprehension and language quality
- A 0.6 threshold determines when a node should be reviewed
- Review intervals are computed using:
  
```
review_interval = -ln(retention_threshold) * ease_factor / decay_factor
```

### Semantic Evaluation with GPT-4

Recap uses GPT-4 to perform bi-directional semantic evaluation:

- AI Comprehension Score (1–4): how well the AI understands the user’s input
- User Quality Score (1–5): based on grammar, vocabulary, and fluency

These scores directly affect the ease factor of each node, ensuring that review intervals are tailored to actual understanding, not guesswork.

### Intelligent Scheduling and Prioritization

- A SortedSet-based priority queue maintains upcoming review tasks
- Nodes with the lowest retention values are surfaced first
- Review batches are optimized to maximize learning efficiency in each session

### Multi-modal Agent-Based Learning

Using the TEN Framework, Recap coordinates multiple agents to guide learning experiences. For example, a visual agent can lead users through Google Street View while a language agent introduces contextually relevant vocabulary for review.

## Architecture

```
[ Sentence / PDF / URL Input ]
            ↓
[ Layered Decomposition ]
            ↓
[ Multi-level Knowledge Graph Construction ]
            ↓
[ GPT-4 Semantic Evaluation ]
            ↓
[ Retention Update and Scheduling ]
            ↓
[ Web-based Visualization and Agent-driven Review ]
```

## Features

- Multi-layer decomposition of learning content
- Real-time retention decay modeling and node-level tracking
- GPT-4 powered semantic scoring and review calibration
- Auto-import and processing from PDF files and web pages
- Dynamic review scheduling with priority sorting
- Multi-modal interaction via coordinated agents and contextual settings
- Visualized memory graphs with live updates

## Tech Stack

- Frontend: React, WebSocket, D3.js
- Backend: FastAPI, Pydantic, sortedcontainers
- AI Integration: OpenAI GPT-4 API
- Agent Framework: TEN Framework
- Data Ingestion: PyMuPDF, BeautifulSoup
- Visualization: Canvas-based graph rendering

### 2. Backend (FastAPI server) setup

In the `backend` directory, install dependencies and start the server with auto-reload:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

> The server will be running at `http://127.0.0.1:8000` with hot-reloading enabled.

### 3. Frontend (React client) setup

In the `frontend` directory, install dependencies and launch the development server:

```bash
cd frontend
npm install
npm run dev
```

> The client will be available at `http://localhost:5173` by default.


## Use Cases

- Language learners mastering vocabulary and morphemes
- Students reviewing STEM concepts using graph-based flows
- Exam prep with adaptive memory reinforcement
- Reading academic papers or web articles with contextual review support
- Real-world visual learning via street view + semantic guidance

## Roadmap

- Open-source curriculum-specific graph templates
- User-generated and sharable knowledge bases
- Offline document reader with real-time retention tracking
- Adaptive difficulty leveling across disciplines
- Cross-platform sync and cloud-based review analytics

## About

This project was built independently in 72 hours during a hackathon. It models memory retention and knowledge structure using layered graph theory, semantic reasoning, and real-time feedback systems.

Author: [Your Name]  
Background: Wolfram Kernel Intern, IOAI Gold Medalist, Full-Stack Developer

## License

MIT License

## Acknowledgments

- OpenAI for GPT-4 API access
- FastAPI for scalable backend architecture
- React and D3.js for frontend graph interaction
- TEN Framework for agent orchestration