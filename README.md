# 🚀 Department GPU Allocator & Governance System

A production-grade, centralized platform for institutional GPU cluster management, automated student request workflows, real-time hardware telemetry monitoring, multi-stage misuse detection (Crypto Mining & Non-Academic Workloads), fail-closed security, and physical workstation governance.

---

## 🏗️ Technical Stack & Architecture

- **Frontend**: Next.js 15 (React 19, Tailwind CSS, Lucide Icons, WebSockets) — Port `3000`
- **Backend API**: TypeScript, Node.js 20, Express.js 4, Prisma ORM 5, PostgreSQL 16, WebSockets — Port `8010`
- **Database**: PostgreSQL 16 (Host Port: `5470`, Internal: `5432`)
- **Machine Agent**: Cross-Platform Python Agent (`pynvml`, `psutil`) running as a **Protected System Service** (`NT AUTHORITY\SYSTEM` on Windows Service / `systemd` unit on Linux)
- **Object Storage**: Supabase Storage (or fallback volume) for student ID verification images

```
┌────────────────────────────────┐
│   Next.js 15 Frontend Portal   │   Host Port: 3000 (Vercel / Local)
│   (Student / Incharge / Super) │
└───────────────┬────────────────┘
                │ REST (HTTPS) + Realtime WebSocket (wss://)
                ▼
┌────────────────────────────────┐        ┌───────────────────────────┐
│   TypeScript Express Backend   │◄──────►│   PostgreSQL 16 Database  │
│   (Prisma ORM, Zod, Auth,      │        │   (Port 5470 / Managed    │
│    Misuse Detection, Scheduler)│        │    Neon / Supabase)       │
└───────────────┬────────────────┘        └───────────────────────────┘
                │ Authenticated Telemetry (every 30s) + Control WS
                ▼
┌────────────────────────────────┐
│  Cross-Platform Python Agent   │   Runs as System Background Service
│  (Windows Service / systemd)   │   (Auto-starts on boot, fail-closed)
└────────────────────────────────┘
```

---

## ⚡ Local Development & Docker Setup

### Option 1: One-Command Docker Compose (Recommended)

From project root:

```bash
docker compose up --build
```

This starts:
- **PostgreSQL Database**: `localhost:5470`
- **TypeScript Express Backend**: `http://localhost:8010` (Auto-seeds database & runs background scheduler)
- **Next.js Web Portal**: `http://localhost:3000`

---

### Option 2: Local Command Line Development

#### 1. Start Database & Backend
```bash
cd backend
npm install
npx prisma db push --schema=src/prisma/schema.prisma
npm run seed
npm run dev
```
*Backend runs on `http://localhost:8010` with WebSocket on `ws://localhost:8010/ws/status`.*

#### 2. Start Frontend Portal
```bash
cd frontend
npm install
npm run dev
```
*Frontend opens on `http://localhost:3000`.*

---

## 🔑 Pre-Configured Demo Accounts

Default Password for all preset accounts: **`password123`**

| Role | Email | Password | Details & Capabilities |
|---|---|---|---|
| 🎓 **Student** | `student@dept.edu` | `password123` | Request GPUs, live ID camera capture, 6-digit launch passcode |
| 🔬 **Lab Incharge** | `incharge@dept.edu` | `password123` | Inspect ID card photo & OCR match in Account Review queue, approve requests |
| 🛡️ **Superuser** | `superuser@dept.edu` | `password123` | Fleet registry, automated PowerShell/Bash installer script generator, audit logs |

---

## 🛡️ Machine Agent Service Installation

The machine agent runs as an unkillable background service started at boot under elevated system accounts.

### Automated Script Installation
Superusers generate and download the installer script from the **Machine Registry** portal page (`/admin/machines`):

- **Windows (`install_agent.ps1`)**:
  - Run in Administrator PowerShell.
  - Clears baseline temporary state.
  - Registers the machine hardware UUID.
  - Installs and starts the `GPUAgent` service under `NT AUTHORITY\SYSTEM` using Windows Service Control (`New-Service` / `sc.exe`).
  - Cannot be terminated by non-admin users via `taskkill` or Task Manager.

- **Linux (`install_agent.sh`)**:
  - Run as `root`.
  - Installs `/etc/systemd/system/gpu-agent.service`.
  - Executes `systemctl daemon-reload && systemctl enable --now gpu-agent`.
  - Automatically restarts on crash and starts on system boot.

---

## 🌐 Production Deployment Guide

### 1. Database Provisioning (Neon / Supabase)
1. Create a managed PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy your connection URI (e.g. `postgresql://user:pass@ep-xyz.aws.neon.tech/gpu_allocator?sslmode=require`).

### 2. Backend Deployment (Render / Railway)
1. Deploy the `backend/` directory to **Render** or **Railway** using the included `Dockerfile` or `render.yaml` / `railway.json`.
2. Configure Environment Variables:
   - `DATABASE_URL`: Your managed Postgres connection string
   - `PORT`: `8010` (or platform default)
   - `JWT_SECRET`: A secure 64-character random string
   - `CORS_ORIGINS`: `https://your-frontend-app.vercel.app`
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: (Optional) For Supabase ID image storage
3. Confirm health check at `https://your-backend.onrender.com/`.

### 3. Frontend Deployment (Vercel)
1. Import the `frontend/` directory into [Vercel](https://vercel.com).
2. Configure Environment Variables in Vercel settings:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend.onrender.com`
   - `NEXT_PUBLIC_WS_URL`: `wss://your-backend.onrender.com/ws/status`
3. Click **Deploy**. Vercel handles Next.js zero-config SSR & static optimization.

### 4. Cross-Domain CORS & WebSocket Verification
The backend Express app includes CORS middleware and WebSocket upgrade support that allows secure `wss://` WebSocket communication across different domains (Vercel frontend domain → Render backend domain).

---

## 🧪 Verification & End-to-End Test Suite

Run the automated end-to-end verification script from the `backend/` directory:

```bash
cd backend
npx tsx src/scripts/verify-e2e.ts
```

This verifies the complete PRD v2.0 lifecycle:
1. Student account signup with live ID capture.
2. Incharge account approval & OCR validation.
3. GPU session request & queue position calculation.
4. Incharge request approval & One-Time Passcode generation.
5. Passcode verification & workspace launch authorization.
6. Simulated misuse telemetry submission → session auto-flagging & machine blocking.
7. Incharge session restoration & termination governance.
