# Distributed Real-Time Code Execution & Interview Platform

> A production-grade, distributed collaborative coding platform designed for technical interviews, system design rounds, and competitive programming. Features secure multi-language code execution inside resource-constrained Docker containers, real-time editor synchronization over WebSockets, in-browser WebRTC video calls, collaborative canvas whiteboard, interviewer rubrics, AI complexity analysis, and keystroke audit playback.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     React 19 Frontend (Vite + Tailwind)                 │
│  - Collaborative Monaco Editor        - In-Browser WebRTC Video Calling │
│  - Real-Time Synced Whiteboard Canvas - Interviewer Rubric Scorecards   │
│  - AI Time/Space Complexity Analyzer  - Keystroke Time-Machine Playback │
│  - Automated Test Case Runner         - Execution Telemetry (RAM, Time) │
└───────────────────▲─────────────────────────────────▲───────────────────┘
                    │ REST APIs (JWT Auth, Problems)  │ WebSockets (Socket.io)
                    ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Node.js / Express API Gateway                         │
│  - JWT Authentication & RBAC (Candidate vs Interviewer vs Admin)       │
│  - PostgreSQL + Prisma ORM (Problems, Sessions, Scorecards, Audits)     │
│  - WebRTC Signaling Cluster (SDP Offers, Answers, ICE Candidates)       │
│  - Real-Time Canvas Whiteboard Vector Synchronizer                      │
│  - Asynchronous Redis Queue Producer (BullMQ)                           │
└───────────────────▲─────────────────────────────────▲───────────────────┘
                    │                                 │
           PostgreSQL Database                  Redis Message Broker
       (Users, Problems, Sessions)         (Submission Queue & Pub/Sub)
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               Background Worker & Sandboxed Docker Engine               │
│  - Distributed BullMQ Worker Consumer                                   │
│  - Isolated Containers (--network none, --memory 128m, --cpus 0.5)      │
│  - Multi-Language: Python 3.10, Node.js 20, C++17, Java 17, Go 1.21    │
│  - Telemetry Engine: Wall-clock Runtime (ms), Peak Memory (KB), CPU %   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Flagship Features

### 1. Sandboxed Multi-Language Docker Sandbox
- **5 Execution Environments**: Python 3.10, Node.js 20, C++17 (GCC 12), Java 17 (OpenJDK), and Go 1.21.
- **Hardened Container Security**:
  - `--network none`: completely isolated from internet, stopping socket listeners & reverse shells.
  - `--memory 128m`: hard memory ceiling preventing memory leaks and out-of-memory crashes.
  - `--cpus 0.5`: throttled CPU quota preventing system hogging.
  - `--pids-limit 64`: terminates fork bombs immediately.
  - Wall-clock timeout enforcement (`SIGKILL` after 3000ms).
- **Execution Telemetry**: Accurate runtime ($ms$), peak resident set size memory ($KB$), exit code tracking, stdout/stderr streams, and automated test-case evaluation.

### 2. In-Browser WebRTC Peer-to-Peer Video Call Grid
- Video and audio streams right inside the interview room.
- Camera toggle, Microphone mute/unmute, and high-definition Screen Sharing.
- Automatic fallback gracefully handling environments where hardware cameras are unavailable.

### 3. Real-Time Collaborative Canvas Whiteboard
- Dedicated vector canvas for system architecture diagrams, graph tracing, and data structure visualization.
- Tools: Freehand pen, lines, rectangles, circles, erasers, stroke colors, and stroke widths.
- Live bidirectional stroke synchronization across all connected interviewers and candidates.
- One-click PNG diagram export.

### 4. 4-Competency Interviewer Grading Rubric & Scorecards
- Structured scoring matrix (1 to 5 stars):
  1. *Problem Solving & Algorithmic Logic*
  2. *Data Structures & Algorithmic Complexity*
  3. *Code Cleanliness, Modularity & Edge Cases*
  4. *Technical Articulation & Thought Process*
- Hire Decision Recommendations: `Strong Hire`, `Hire`, `Leaning Hire`, `Leaning No Hire`, `Strong No Hire`.
- Private recruiter/interviewer notes and downloadable Markdown Evaluation Summary Reports.

### 5. AI Algorithmic Complexity & Edge-Case Analyzer
- Evaluates estimated Time Complexity (e.g. $O(N)$ vs $O(N \log N)$ vs $O(N^2)$) and Space Complexity ($O(1)$ vs $O(N)$).
- Highlights critical edge cases to watch out for (e.g. empty arrays, single-element collections, integer overflow).

### 6. Keystroke Playback & Time-Machine (Anti-Cheat Audit)
- Records timestamped keystroke deltas and code size progression into PostgreSQL.
- Interactive timeline scrubber slider allowing interviewers to replay how the candidate arrived at the solution step-by-step, spotting sudden large pasted code blocks.

---

## 🚀 Quickstart Guide

### Step 1: Spin Up Infrastructure (PostgreSQL & Redis)
```bash
docker compose up -d
```

### Step 2: Push Database Schema & Seed Problems
```bash
cd server
npm run prisma:push
npm run prisma:seed
cd ..
```

> **Default Seed Accounts:**
> - **Interviewer:** `interviewer@example.com` / `password123`
> - **Candidate:** `candidate@example.com` / `password123`

### Step 3: Launch Services
Run the 1-click startup script:
```powershell
.\start-dev.bat
```
Or start each service manually:
- `npm run dev:server` (Port 5000)
- `npm run dev:worker` (Redis Queue Worker)
- `npm run dev:client` (Port 5173)

Open **http://localhost:5173** in your browser.

---

## 📄 License
MIT License. Open-source for collaborative engineering and interview prep.
