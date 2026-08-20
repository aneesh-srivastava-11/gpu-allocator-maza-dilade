# Department GPU Management System — User Guide & Walkthrough

The **Department GPU Management System** (v2.0) is a production-grade, centralized platform for allocating, monitoring, and governing access to department GPU workstations.

---

## 🚀 How to Run the System

### Option 1: One-Command Docker Compose Run (Recommended)

From `c:\Users\ANEESH\Desktop\gpu-allocator-real\`:

```bash
docker compose up --build
```

This starts:
1. **PostgreSQL Database** on `localhost:5470`
2. **TypeScript Express Backend & WebSocket Stream** on `http://localhost:8010` (Auto-runs Prisma migrations & seeds initial database)
3. **Next.js Frontend Portal** on `http://localhost:3000`

---

### Option 2: Local Development Run

#### 1. Start Database & Backend
```bash
# Terminal 1: Backend
cd backend
npm install
npx prisma db push --schema=src/prisma/schema.prisma
npm run seed
npm run dev
```
*Backend runs on `http://localhost:8010` with WebSocket stream on `ws://localhost:8010/ws/status`.*

#### 2. Start Frontend
```bash
# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```
*Frontend portal opens on `http://localhost:3000`.*

---

## 🔑 Pre-Configured Demo Accounts

You can log in instantly using the **Quick Demo Presets** on the login page:

| Role | Email | Password | Preset Name | Capabilities |
|---|---|---|---|---|
| **Student** | `student@dept.edu` | `password123` | Alex (Student) | Request GPUs, enter one-time launch code, launch JupyterLab |
| **Lab Incharge** | `incharge@dept.edu` | `password123` | Dr. Vance (Incharge) | Approve GPU requests, inspect ID photos & OCR in Account Review queue, restore/terminate sessions |
| **Superuser** | `superuser@dept.edu` | `password123` | Dr. Connor (Superuser) | Register new department hardware, download installer scripts, access audit logs & system stats |

---

## 👤 User Guides by Role

### 1. 🎓 Student Flow (`/student/dashboard` & `/signup`)

#### Account Signup with Live ID Verification
1. Navigate to `http://localhost:3000/signup` (or click **Create an Account** on the login page).
2. Enter your Name, Roll Number, Department, Email, and Password.
3. Click **Snap ID Card Photo** — the portal uses your device camera API for a **live, in-app capture**. *(Gallery uploads are disabled by design to prevent identity fraud).*
4. Submit the account. It sits at `pending_review` until a Lab Incharge approves it.

#### Requesting GPU Workstation Time
1. Log in as `student@dept.edu`.
2. Go to **GPU Directory** (`/student/gpus`).
3. Select an idle workstation and click **Request Allocation**.
4. Enter your academic reason (e.g., "Fine-tuning LLaMA 3 for thesis research") and desired time window.
5. If the machine is free, your request moves to `pending_approval`. If busy, you are automatically assigned a **fair queue position** (e.g. Position #1).

#### One-Time Passcode Entry & Workspace Launch (PRD §5.3)
1. Once approved, go to **Launch Workspace** (`/student/workspace`).
2. You will see your in-app delivered **6-digit One-Time Launch Code** on your dashboard.
3. Enter the 6-digit code into the prompt and click **Verify Code & Launch JupyterLab Workspace**.
4. On verification success, access is authorized and your JupyterLab instance opens with GPU acceleration enabled.

---

### 2. 🔬 Lab Incharge Flow (`/incharge/dashboard`)

#### Reviewing Pending Student Accounts (PRD §5.1)
1. Log in as `incharge@dept.edu`.
2. Navigate to **Account Review** (`/incharge/account-review`).
3. Inspect pending student registrations side-by-side:
   - View the live captured ID card photo.
   - Inspect the **OCR Extracted Name** and the **OCR Name Match Signal** (`OCR Match` vs `Name Mismatch`).
4. Click **Approve Account** or **Reject**.

#### Approving GPU Session Requests
1. Go to **Approval Queue** (`/incharge/approvals`).
2. Review pending GPU time requests for labs you manage.
3. Click **Approve** (generates a one-time code for the student) or **Reject** (automatically promotes the next student in line).

#### Misuse Flag Governance & Session Control (PRD §5.5)
1. If continuous background monitoring detects non-academic misuse (mining pools, gaming, or fail-closed disconnects):
   - The session is suspended immediately and marked `flagged`.
2. Incharge receives a realtime alert and reviews the telemetry evidence.
3. Incharge can click **Restore Session** (generates a fresh one-time launch code for the student) or **Terminate Session** (frees the machine for queued students).

---

### 3. 🛡️ Superuser Flow (`/admin/overview`)

#### Registering New Hardware & Automated Script Generation (PRD §9.1)
1. Log in as `superuser@dept.edu`.
2. Go to **Machine Registry** (`/admin/machines`).
3. Click **Register New Machine**.
4. Select the target lab, enter the machine hostname, and choose the OS (`Windows (PowerShell)` or `Linux (Bash)`).
5. Click **Generate Install Script**.
6. Click **Download Script** (`install_agent.ps1` or `install_agent.sh`).
7. Running this script on a department workstation executes a **baseline state reset** and registers the background agent with a persistent, hardware-bound ID.

#### Cross-Lab Audit Trail & Department Analytics
1. Navigate to **Audit Log** (`/admin/audit-log`) to inspect every account approval, rejection, flag, session restore, and termination recorded with timestamps and actor IDs.
2. View **Admin Overview** (`/admin/overview`) for department-wide GPU utilization, active sessions, blocked machines, and request totals.

---

## 🛠️ Machine Agent Daemon (`agent/core.py`)

Each physical workstation runs the cross-platform Python agent located in `agent/`:

```bash
cd agent
pip install -r requirements.txt
python core.py
```

The agent runs as a protected background service:
- Reports GPU utilization (`pynvml`), process signatures, and network connections (`psutil`) every 30 seconds over `wss://`.
- Executes **fail-closed locking** if backend connectivity is lost for >90 seconds.
- Applies platform-native enforcement (Windows Credential Lock / `netsh advfirewall` on Windows; `loginctl` / `iptables` on Linux).
