# Distributed Real-Time Code Execution & Interview Platform

> A production-grade, distributed collaborative coding platform designed for technical interviews and competitive programming. Features secure multi-language code execution inside resource-constrained Docker containers, real-time editor synchronization over WebSockets, an asynchronous Redis-backed worker queue, and detailed telemetry analysis.

---

## 🏗️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     React 19 Frontend (Vite + Tailwind)                 │
│  - Collaborative Monaco Editor        - Real-Time Room Presence & Chat  │
│  - Automated Test Case Runner         - Execution Telemetry (RAM, Time) │
└───────────────────▲─────────────────────────────────▲───────────────────┘
                    │ REST APIs (JWT Auth, Problems)  │ WebSockets (Socket.io)
                    ▼                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Node.js / Express API Gateway                         │
│  - JWT Authentication & RBAC (Candidate vs Interviewer vs Admin)       │
│  - PostgreSQL + Prisma ORM (Problems, Testcases, Sessions, Telemetry)   │
│  - Collaborative Room Socket Server & Presence Clustering               │
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
│  - Isolated Docker Container Execution (--network none, --memory 128m)  │
│  - Multi-Language Support: Python 3.10, Node.js 20, C++17 (GCC 12)      │
│  - Telemetry Engine: Wall-clock Runtime (ms), Peak Memory (KB), CPU %   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Core Technical Highlights

### 1. Sandboxed Multi-Language Docker Execution
- **Isolated Containers**: Submissions are mounted into ephemeral containers (`python:3.10-slim`, `node:20-alpine`, `gcc:12`).
- **Resource Constraints**:
  - Memory limit: `--memory=128m` (prevents memory starvation / fork bombs)
  - CPU limit: `--cpus=0.5` (prevents CPU exhaustion)
  - Process limit: `--pids-limit=64` (mitigates recursive fork bomb attacks)
  - Network isolation: `--network=none` (blocks network calls, socket listeners, and reverse shells)
- **Execution Telemetry**: High-resolution wall-clock timer (`process.hrtime.bigint()`), peak RSS memory monitoring, exit code tracking, stdout/stderr capture, and automated test-case evaluation.
- **Resilient Fallback Runner**: Includes a safe local subprocess execution mode for rapid development and testing when the Docker daemon is booting.

### 2. Real-Time Editor Synchronization & WebSockets
- **Monaco Code Editor**: Full VS Code-grade coding experience with syntax highlighting and indentation.
- **Socket.io Clustering**: Real-time room broadcasts for code synchronization, cursor movement, peer presence, language switching, and live chat.
- **Pub/Sub Telemetry Streaming**: Background workers publish execution telemetry over Redis Pub/Sub directly to the WebSocket server, pushing test case results to client browsers in milliseconds.

### 3. Asynchronous Worker Queue (Redis + BullMQ)
- API gateway immediately returns `202 Accepted` with a `submissionId` without blocking HTTP worker threads.
- Jobs are dispatched to Redis BullMQ queue with automatic retries, backoff strategies, and concurrent consumer scaling.

### 4. Relational Data Modeling & RBAC (PostgreSQL + Prisma)
- Strict Role-Based Access Control (`CANDIDATE`, `INTERVIEWER`, `ADMIN`).
- Normalized relational schemas for `User`, `Problem`, `TestCase` (public vs hidden), `InterviewSession`, `Submission`, and `ExecutionTelemetry`.

---

## 🚀 Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher; v22 recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL, Redis, and containerized sandboxes)
- [Git](https://git-scm.com/)

---

### Step 1: Clone and Install Dependencies

```bash
# Install root, server, worker, and client dependencies
npm run install:all
```

---

### Step 2: Spin Up Infrastructure (PostgreSQL & Redis)

Start the PostgreSQL and Redis containers using Docker Compose:

```bash
docker compose up -d
```

Verify containers are healthy:
```bash
docker ps
```

---

### Step 3: Run Database Migrations & Seed Data

Push the Prisma schema to PostgreSQL and seed initial interview problems and demo users:

```bash
cd server
npm run prisma:push
npm run prisma:seed
cd ..
```

> **Default Seed Accounts:**
> - **Interviewer:** `interviewer@example.com` / `password123`
> - **Candidate:** `candidate@example.com` / `password123`

---

### Step 4: Start the Services

Open three terminal windows (or use the provided scripts):

**Terminal 1 — API Gateway & WebSocket Server:**
```bash
npm run dev:server
# Running on http://localhost:5000
```

**Terminal 2 — Background Code Execution Worker:**
```bash
npm run dev:worker
# Listening to BullMQ 'code-submissions' queue
```

**Terminal 3 — React Client:**
```bash
npm run dev:client
# Running on http://localhost:5173
```

---

## 🌐 API Reference

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user as Candidate or Interviewer |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current authenticated user profile |
| `GET` | `/api/problems` | Authenticated | List all algorithmic problems with filters |
| `GET` | `/api/problems/:id` | Authenticated | Retrieve problem description & public test cases |
| `POST` | `/api/problems` | Interviewer | Create new problem with public and hidden test cases |
| `POST` | `/api/submissions` | Authenticated | Enqueue code execution job into Redis queue |
| `GET` | `/api/submissions/:id` | Authenticated | Fetch execution status and telemetry results |
| `GET` | `/api/sessions` | Authenticated | List active and scheduled interview rooms |
| `POST` | `/api/sessions` | Interviewer | Create new interview room and invite candidate |
| `GET` | `/api/sessions/:id` | Authenticated | Fetch session details, code snapshot, and problem |

---

## 🔒 Docker Sandbox Security Checklist

- [x] Ephemeral containers (`--rm`) destroyed immediately after execution.
- [x] Network disabled (`--network none`) to prevent exfiltration or outbound connections.
- [x] Memory bounded (`-m 128m`) to prevent RAM exhaustion.
- [x] CPU quota throttled (`--cpus 0.5`) to prevent high system load.
- [x] Process limits enforced (`--pids-limit 64`) to prevent fork bombs.
- [x] Hard execution timeout enforced with `SIGKILL` after 3000ms.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
