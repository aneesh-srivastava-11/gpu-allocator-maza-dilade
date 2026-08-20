# Technical Requirements Document
## Department GPU Management System

**Version:** 2.0
**Status:** Draft
**Companion to:** PRD v2.0

---

## 1. Architecture Overview

```
┌──────────────────────────┐
│   Next.js Frontend       │   Hosted on Vercel
│   (Portal — all 3 roles) │
└─────────────┬────────────┘
              │ REST + WebSocket
              ▼
┌──────────────────────────┐        ┌──────────────────┐
│ Express (TS) Backend     │◄──────►│   PostgreSQL DB    │
│ (Node.js, Prisma ORM,    │        │   (Managed — Neon/  │
│  Zod, Auth, Telemetry)   │        │    Supabase/RDS)    │
└─────────────┬────────────┘        └──────────────────┘
              │ authenticated telemetry (every 30s) + commands
              ▼
┌──────────────────────────┐
│   Agent — Windows & Linux│   System Background Service
│   (Python daemon)        │   (systemd / Windows Service)
└──────────────────────────┘
```

### 1.1 Stack Specification & Hosting Architecture

- **Frontend (Next.js)** → Vercel ([http://localhost:3000](http://localhost:3000) for local dev & Docker Compose)
- **Backend (TypeScript / Express / Prisma)** → Render / Railway / Fly.io ([http://localhost:8010](http://localhost:8010) for local dev)
- **Agent (Python System Service)** → Runs on physical lab PCs under SYSTEM / root as background service
- **Database** → Managed PostgreSQL 16 (Neon / Supabase)

The frontend on Vercel simply points its API calls and WebSocket connection at the backend's public URL — this is a standard, well-supported pattern and requires no special handling beyond setting the right environment variable for the API base URL.

## 2. Data Model

```sql
users (
  id, name, email, roll_number,
  role enum('superuser','incharge','student'),
  password_hash,
  id_card_image_url, id_ocr_extracted_name, id_name_match boolean,
  account_status enum('pending_review','active','rejected'),
  managed_lab_ids (for incharge role),
  created_at
)

labs (
  id, name, location
)

machines (
  id, lab_id -> labs.id, name,
  os enum('windows','linux'),
  hardware_id text unique,       -- persistent ID generated at agent install, independent of network
  status enum('idle','allocated','blocked','offline'),
  last_seen_at
)

requests (
  id, student_id -> users.id, machine_id -> machines.id,
  reason text, start_time, end_time,
  status enum('queued','pending_approval','approved','rejected','active','completed'),
  queue_position, created_at
)

sessions (
  id, request_id -> requests.id,
  started_at, flagged_at, blocked_at, ended_at,
  status enum('awaiting_code','active','flagged','blocked','completed'),
  one_time_code_hash, code_generated_at, code_attempts
)

telemetry_reports (
  id, session_id -> sessions.id, reported_at,
  gpu_util_pct, process_signature json, network_connections json
)

flags (
  id, session_id -> sessions.id, telemetry_report_id -> telemetry_reports.id,
  type enum('mining','gaming','other'), evidence json, created_at
)

audit_log (
  id, actor_id -> users.id, action text, target_type text, target_id uuid,
  metadata json, created_at
)
```

## 3. Account Onboarding & Verification

1. **Capture:** the frontend's signup flow uses the device camera API directly (`navigator.mediaDevices.getUserMedia` in the browser) to take the ID card photo — no file-picker/gallery option is exposed, so a pre-existing image cannot be substituted
2. **OCR check:** on submission, the backend runs the captured image through an OCR service (e.g. Tesseract, self-hosted — no external API dependency needed) to extract printed text, and does a fuzzy string match against the name field the student entered; the result (`id_name_match`) is stored and surfaced to the incharge as a signal, not an auto-reject
3. **Review:** the account sits at `pending_review`; an incharge sees the photo, extracted text, match result, and entered details side by side, and approves or rejects
4. **No liveness verification** is performed — this is a stated system limitation (PRD §9), not a gap to silently paper over in the report

## 4. Machine Registration & Identity

### 4.1 Installer generation (pilot-scale onboarding)

At 60 machines across two labs, manual per-machine setup doesn't scale even as a one-time task. The superuser dashboard exposes a **"Register New Machine"** action:

1. Generates a one-time registration token, stored server-side against a pending machine record
2. Produces a downloadable install script (PowerShell for Windows, bash for Linux) with the token embedded
3. The script, run once on the target machine, performs two steps in sequence:
   a. **Baseline reset** — clears/resets local user profiles and app state to a known clean starting point, so every machine begins the pilot from the same baseline regardless of prior use
   b. **Agent install** — installs the agent as a background service (Windows Service / systemd unit) and calls `POST /machines/register` with the embedded token, which the backend exchanges for the machine's persistent `hardware_id` and per-machine telemetry auth token

This gives a single, repeatable procedure that can be rerun later (e.g. re-baselining a machine mid-pilot) rather than a one-off manual setup.

### 4.2 Network transport — firewall resilience

All agent-to-backend traffic (telemetry, commands) runs over **`wss://` (TLS WebSocket) on standard port 443** rather than a custom port — this is indistinguishable from ordinary HTTPS traffic to most firewalls/proxies, which sidesteps the most common way outbound traffic gets silently blocked on institutional networks. If a given network's proxy still blocks WebSocket upgrade specifically, the agent falls back to plain HTTPS polling (a `GET /machines/{hardware_id}/commands` every 30s) — same port, same protocol family, functionally equivalent but not connection-held-open. Worth validating on a single machine on the actual campus network before rolling the installer out to all 60.

### 4.3 Persistent identity

- At agent install time, the agent generates a UUID and persists it locally (e.g. in a config file or the OS's secure local storage)
- This `hardware_id` — not IP address — is what the machine uses to authenticate every request to the backend from then on, so it's recognized correctly regardless of which network (campus wifi, ethernet, a different subnet entirely) it's connected to at any given moment
- The backend maintains a `last_seen_at` timestamp per machine; a machine that hasn't reported in beyond a grace threshold (see §6) is marked `offline` and any active session on it moves to fail-closed

## 5. Session Lifecycle & One-Time Code

1. On incharge approval of a request, the backend creates a `sessions` row with status `awaiting_code`, generates a random one-time code, and stores only its hash (never the code itself) alongside a short expiry
2. The code is returned to the frontend only via the authenticated student's own dashboard fetch — never logged, never sent through any external channel
3. **Enforcement point:** the code is checked at the **"Launch Workspace"** action (not the OS login screen — see rationale below), via `POST /sessions/{id}/verify-code`
4. On success: session status → `active`, backend instructs the agent (next check-in) to start the machine's JupyterLab instance for that student, telemetry scoring begins
5. On repeated failure: rate-limited (e.g. 5 attempts) before the code is invalidated and a fresh approval cycle is required

**Why launch-time rather than OS-login-time:** intercepting the native OS login/lock screen requires a custom Windows Credential Provider and a custom Linux PAM module — both nontrivial, OS-version-sensitive integrations. Gating at the application layer (the workspace launch button) achieves the same access-control outcome — no code, no compute access — with a fraction of the engineering effort, and is portable across the mixed Windows/Linux fleet without OS-specific login-flow code.

## 6. Agent Design (Cross-Platform)

The agent is a single Python codebase with an OS-abstraction layer for the handful of actions that genuinely differ by platform.

```
agent/
  core.py            # telemetry loop, backend communication — identical on both OSes
  telemetry.py        # pynvml + psutil sampling — identical on both OSes
  enforcement/
    base.py            # Enforcer interface: lock(), block_network(), suspend_process(pid)
    windows.py          # netsh advfirewall, rundll32 LockWorkStation, psutil.suspend()
    linux.py            # ufw/iptables, loginctl lock-session, psutil.suspend()
  service_windows.py   # registers as a Windows Service (pywin32/NSSM)
  service_linux.py      # registers as a systemd unit
```

- **Telemetry interval:** every 30 seconds — samples GPU utilization, process list, and outbound network connections via `pynvml` (GPU-level) and `psutil` (process/network-level), both of which work identically on Windows and Linux
- **Runs as a protected background service**, started at boot, independent of which user is logged in — not something a standard (non-admin) student account can casually stop
- **Fail-closed behavior:** if the agent cannot reach the backend for more than 2 consecutive expected check-ins (~90 seconds at a 30s interval), it locks the session locally by default, rather than continuing to allow unmonitored access

## 7. Misuse Detection

- **Fast-path rules:** known mining-pool ports (3333, 4444, 14444, 8333, 9333) and known mining binaries (`xmrig`, `ethminer`, `cgminer`, etc.) trigger an immediate flag — cheap, high-confidence, no scoring delay
- **Pattern-based scoring:** sustained high GPU utilization without an expected process signature for the session's declared workload category (e.g. no `python`/`torch`/`jupyter` present) accumulates a suspicion score over a short rolling window; crossing a threshold triggers a flag
- Both paths write to the `flags` table with the triggering telemetry report attached as evidence, for the incharge to review

## 8. API Surface (representative)

**Accounts**
- `POST /accounts` (student signup, includes ID image)
- `GET /accounts/pending` (incharge review queue)
- `POST /accounts/{id}/approve` / `POST /accounts/{id}/reject`

**Labs / Machines**
- `GET /labs`, `GET /labs/{id}/machines`
- `POST /machines/register` (agent self-registration at install, using its generated hardware_id)

**Requests / Sessions**
- `POST /requests`, `GET /requests/mine`, `GET /requests/pending`
- `POST /requests/{id}/approve`, `POST /requests/{id}/reject`
- `POST /sessions/{id}/verify-code`
- `POST /sessions/{id}/terminate`

**Agent**
- `POST /machines/{hardware_id}/telemetry` (authenticated by hardware_id + a per-machine token issued at registration)
- `WS /agent/{hardware_id}/commands` (backend pushes lock/unlock/start-workspace instructions)

**Realtime (frontend)**
- `WS /ws/status` — queue position, session state, flag events

## 9. Security Considerations

- Passwords hashed (bcrypt/argon2); JWT session tokens with reasonable expiry
- One-time codes stored as hashes only, short expiry, attempt-limited
- Machine-to-backend telemetry authenticated by a per-machine token issued at registration — not just the hardware_id alone, which prevents a spoofed machine from submitting fake telemetry
- All approve/reject/flag/restore/terminate actions written to `audit_log` with actor, target, and timestamp
- ID card images stored in access-controlled object storage, not the database directly; only incharges and superusers can retrieve them

## 10. Deployment Summary

| Component | Host |
|---|---|
| Frontend (Next.js) | Vercel |
| Backend (FastAPI, WebSocket) | Render / Railway / Fly.io |
| Database | Neon / Supabase (managed Postgres) |
| Object storage (ID images) | Same provider's storage add-on, or S3-compatible bucket |
| Agents | Installed directly on each lab machine (Windows Service / systemd unit) |
