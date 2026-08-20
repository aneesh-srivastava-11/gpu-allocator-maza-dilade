# Product Requirements Document
## Department GPU Management System

**Version:** 2.0
**Status:** Draft
**Supersedes:** PRD v1.0

---

## 1. Overview

The Department GPU Management System is a centralized platform for allocating, monitoring, and governing access to department GPU workstations. It replaces informal, untracked allocation with a verified-identity account system, a request-and-approval workflow, and continuous usage monitoring — while remaining lightweight enough for a single department to operate without dedicated IT infrastructure beyond the machines themselves.

This version supersedes the original single-role design. It introduces a three-tier account hierarchy, identity-verified onboarding, and a per-session access model suited to full physical PC allocation (each session runs directly on department hardware — no virtualization or containerization layer).

## 2. Goals

- Give every department GPU machine a verified, accountable user for every minute it's in use
- Replace ad-hoc booking with a transparent request → approval → session lifecycle
- Continuously monitor active sessions for non-academic use (mining, gaming) without relying on brittle, easily-evaded static rules
- Keep the system operable by a small, three-role team (superuser, lab incharges, students) without requiring a dedicated IT department
- Support a mixed hardware fleet (Windows and Linux machines) transparently, with no difference in the student experience

## 3. Non-Goals (Out of Scope for this Version)

- Automated, self-service onboarding at scale (accounts are manually reviewed and approved — see §9)
- Billing or GPU-hour chargeback
- Job scheduling / workload orchestration (this governs *access*, not what runs inside a session)
- Biometric or liveness-verified identity checks (ID verification is document-based; see §6.2)

## 4. Roles

| Role | Description | Capabilities |
|---|---|---|
| **Superuser** | Department-level administrator | Creates lab incharge accounts; installs and registers the monitoring agent on lab machines; full audit visibility across all labs |
| **Lab Incharge** | Manages one or more physical labs | Reviews and approves/rejects new student account requests (incl. ID verification); approves/rejects GPU session requests for their labs; resolves flagged sessions |
| **Student** | Requests and uses GPU time | Creates an account (with ID verification), requests GPU sessions, views live queue/session status, launches their workspace once a session is active |

## 5. Core Flows

### 5.1 Account Onboarding
1. Student opens the portal and starts account creation: name, roll number, department, and other required details
2. The signup flow captures a **live, in-app camera photo of the student's ID card** — gallery uploads are disabled by design, so a saved or borrowed image can't be submitted in place of a fresh capture
3. The submitted image is passed through OCR to extract the printed name, which is automatically compared against the name entered in the form; a mismatch is flagged for the incharge's attention but does not auto-reject
4. The account sits as `pending_review` until a lab incharge manually reviews the details and photo and approves or rejects it
5. On approval, the account is fully active

### 5.2 GPU Session Request
1. An active student browses available machines by lab (OS is not shown — irrelevant to the student) and submits a request: machine, reason, and time window
2. If the machine is free for that window, the request goes to `pending_approval`; if busy, it queues automatically in submission order
3. A lab incharge reviews and approves or rejects pending requests for labs they manage
4. On approval, the system generates a **session-specific one-time code**, tied to that request and that machine only

### 5.3 Session Start
1. The student sits at the assigned machine and signs in with their normal account credentials — the machine's agent has already confirmed with the backend that this account has an approved, active session for this specific window
2. The student opens the portal on any device (the same machine, or their phone) and sees their session's one-time code on their dashboard — delivered in-app only, never by email or SMS
3. The student opens **"Launch Workspace"**, which prompts for that code before starting the session's JupyterLab instance
4. On success, JupyterLab opens with the GPU already available; on failure, the workspace does not launch

### 5.4 Continuous Monitoring
1. From the moment a session is marked `active`, the agent on that machine reports GPU utilization, running processes, and network activity to the backend every 30 seconds
2. Each report is scored against expected usage patterns for the session's declared purpose
3. If the backend does not hear from a machine for more than a short grace period during an active session, the session is treated as **fail-closed** — access is suspended until connectivity and monitoring resume, rather than assumed safe

### 5.5 Misuse Handling
1. A flagged report suspends the session immediately — the machine locks and network access is cut at the OS level
2. The assigned lab incharge is notified in-app and reviews the flag evidence
3. The incharge either restores the session (generating a fresh one-time code for the student to re-enter) or terminates it outright, freeing the machine for the next queued student
4. Every approval, rejection, flag, restore, and termination is written to an audit log

## 6. Feature Requirements

| # | Feature | Priority |
|---|---|---|
| F1 | Superuser account + incharge account creation | P0 |
| F2 | Student account creation with camera-only ID capture + OCR name-match check | P0 |
| F3 | Incharge manual account review/approval queue | P0 |
| F4 | Lab/machine directory with live status, hardware-bound machine identity | P0 |
| F5 | GPU session request + fair queueing per machine | P0 |
| F6 | Incharge session approval/rejection queue | P0 |
| F7 | Per-session one-time code, delivered in-app only | P0 |
| F8 | Cross-platform (Windows + Linux) monitoring agent, 30-second telemetry interval | P0 |
| F9 | Misuse detection (mining/gaming pattern recognition) | P0 |
| F10 | Automatic session suspension on flag + fail-closed on connectivity loss | P0 |
| F11 | Incharge flag review + restore/terminate action | P0 |
| F12 | Full audit log across all account and session actions | P1 |
| F13 | JupyterLab as the universal, OS-agnostic student workspace | P0 |
| F14 | Cross-lab superuser dashboard | P1 |
| F15 | Automated/self-service onboarding | P2 (future) |
| F16 | Superuser dashboard generates a downloadable, per-machine install script (agent install + one-time baseline reset bundled together) | P0 |

## 7. UI/UX Requirements

The interface should read as a modern institutional portal, consistent across every role:

- Warm orange accent for primary actions and active navigation state
- Deep navy fixed sidebar, consistent across light and dark mode
- Card-based dashboards: a hero banner per role's home view, followed by stat cards and content sections
- Dark mode toggle, persisted per user
- Fully responsive down to mobile widths — sidebar collapses to a drawer, cards reflow to single column
- The one-time session code and "Launch Workspace" action should be the most prominent element on a student's dashboard once a session is approved — this is the step every active session depends on

## 8. Non-Functional Requirements

- No email or SMS dependency anywhere in the system — all delivery (codes, notifications) is in-app
- Machine identity must be independent of network/IP — a machine is recognized by a persistent hardware-bound ID regardless of what network it's connected to
- The student experience must be identical regardless of whether the underlying machine runs Windows or Linux
- Fail-closed behavior on any loss of monitoring connectivity during an active session

## 9. Known Limitations (stated explicitly, not hidden)

- Account onboarding, session approval, and agent installation are manual processes in this version — this is appropriate for a single department at moderate scale, and is intentionally deferred rather than automated prematurely
- ID verification is document-based (a photo of the card) with an automated name cross-check; it does not verify that the card belongs to the person holding it. This is a stated limitation, not a gap to be silently assumed away
- Session data hygiene between consecutive students on the same machine is a stated user/lab responsibility, not system-enforced

## 9.1 Machine Onboarding (Pilot-Scale)

Given the pilot rolls out across two labs (60 machines total), manual per-machine setup by hand is not realistic. Instead:

- The superuser dashboard has a **"Register New Machine"** action that generates a one-time registration token and produces a downloadable install script (PowerShell for Windows, shell script for Linux)
- Running that script on a machine does two things in one step: resets the machine's local state to a known clean baseline, then installs and registers the agent using the embedded token
- This removes the need to manually judge or standardize each machine's starting state before rollout, and gives a repeatable procedure for re-baselining machines later in the pilot's life

## 10. Milestones

1. Account system: roles, onboarding, ID capture, incharge approval queue
2. Machine directory + hardware-bound identity registration
3. Session request, queueing, and incharge approval
4. Cross-platform agent: telemetry loop, per-session code enforcement at workspace launch
5. Misuse detection + suspend/restore/terminate flow
6. Audit logging, dark mode, full responsive pass
