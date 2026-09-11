# OJTHub System Architecture & Feature Guide

This document details the architecture, design choices, and feature implementations of **OJTHub: Geofenced OJT Attendance, AI-Assisted Reporting, and Customizable OJT Management Progressive Web Application**, strictly aligned with **Proposal-4_OJTHub.docx**.

---

## 1. System Overview & Architecture

OJTHub is designed as a modern, decoupled web application composed of:
1. **Frontend Client:** A high-performance **React.js + Vite + Tailwind CSS** Progressive Web Application (PWA).
2. **Backend API:** An **ASP.NET Core .NET 10 LTS Minimal API** service.
3. **Relational Database:** **PostgreSQL + Entity Framework Core** (running locally via Docker container `ojthub-db` and ready for cloud hosting on Render/Railway).
4. **AI Integration:** **Google Gemini API** (`gemini-1.5-flash`) for automated draft synthesis of daily standup and narrative journal reports via backend proxy.
5. **Document Engine:** **jsPDF + jsPDF-AutoTable** for client-side Daily Time Record (DTR) PDF compilation.

### The System Analogy (No-Jargon Overview)
* **The PWA Frontend** is like a **Student's Smart Badge**: It's installable on any phone or laptop, stays responsive anywhere, and keeps track of activities even before an official account is created.
* **The Guest Storage** is like a **Local Notepad**: When a trainee uses the app without logging in, all workplace locations, shifts, and notes stay safely in their browser's private storage.
* **The JWT Token** is like an **Encrypted Digital Keycard**: Once the trainee or supervisor logs in at the front desk, this keycard opens the doors they have permission to access.
* **The ASP.NET Core Backend** is the **Front Desk & Concierge**: It checks keycards, measures distances to verify the student is physically within the company workplace perimeter, logs tamper-proof timestamps, and relays requests.
* **The Gemini AI Service** is the **Documentation Specialist**: It reads raw daily task bullet points and crafts executive-ready daily standup summaries or reflective weekly journals.
* **The PostgreSQL Database** is the **Secure Central Vault**: Storing unalterable records of attendance, hours, supervisor verifications, and user credentials.

---

## 2. Core Implemented Features (Proposal Section 5 Alignment)

### 2.1 Geofenced Attendance Engine & Workplace Calibration
* **Purpose:** Ensures trainee attendance records reflect physical proximity to the assigned workplace, with effortless calibration.
* **Implementation:**
  * Uses the browser `navigator.geolocation` API to capture latitude, longitude, and device GPS accuracy.
  * **1-Click Workplace Calibration:** Trainees can calibrate their workplace coordinates directly from the Dashboard with one click (**"📍 Set Current Location as Workplace"**), adjusting the geofence perimeter instantly to their current location without manual latitude/longitude entry.
  * **Accuracy Gate:** GPS readings with accuracy exceeding the configured threshold (default: 50 meters) are flagged or blocked with clear prompts to move near windows or outdoors.
  * **Haversine Distance Verification:** Both server-side and client-side calculate exact meter-level distance between trainee coordinates and workplace coordinates (`WorkplaceLatitude`, `WorkplaceLongitude`).
  * **Shift State Machine:** Prevents duplicate Time-In actions while a shift is open, and prohibits Time-Out without an active Time-In.
  * **Timestamp Integrity:** Shift start and end times are recorded using server-side UTC timestamps (`DateTimeOffset.UtcNow`), neutralizing device clock tampering.

### 2.2 Automated Hours Calculation Engine
* **Purpose:** Eliminates manual calculation errors in Daily Time Records.
* **Implementation:**
  * Calculates daily net hours: `(TimeOut - TimeIn) - LunchBreakMinutes`.
  * For shifts under 4 hours, lunch break deduction is automatically waived.
  * Dynamically computes cumulative rendered hours, remaining required hours, percentage completion, and estimated completion date based on daily schedule hours.

### 2.3 Daily Activity Logging
* **Purpose:** Enables continuous, categorized task documentation for trainees.
* **Implementation:**
  * CRUD endpoints at `/api/activities` (cloud mode) and `guestStore` (guest mode).
  * Allows logging task headlines, hours spent, categories (Development, Testing, Documentation, Meetings, Support, etc.), and detailed accomplishment notes.

### 2.4 AI-Assisted Reporting (Google Gemini API)
* **Purpose:** Automates the creation of polished End-of-Day (EOD) standup summaries and narrative journals.
* **Implementation:**
  * Endpoint `POST /api/reports/ai-generate`.
  * Aggregates activity entries across the selected date range.
  * Communicates securely with the Google Gemini API using server-side credentials.
  * **Guest Mode Support:** Guest trainees can generate AI reports using their local browser activity logs.
  * **Human-in-the-loop Review:** The trainee reviews and edits the AI-generated draft in the frontend workspace before saving.
  * **Multi-Format Export:** Supports one-click copy to Markdown, Email/Formal, and Slack/Discord chat formatting.

### 2.5 Printable PDF Daily Time Record (DTR)
* **Purpose:** Produces official, institutional-grade DTR documents ready for printing and supervisor submission.
* **Implementation:**
  * Client-side vector PDF generation using `jsPDF` and `jsPDF-AutoTable`.
  * Generates monthly calendar table (Days 1 to 31), daily Time-In, Lunch break, Time-Out, Daily Net Hours, and cumulative totals.
  * Includes formal certification declarations and signature lines for both the Trainee and the Authorized Supervisor.

### 2.6 Supervisor / Instructor Verification Portal
* **Purpose:** Gives authorized supervisors and academic instructors direct visibility into student attendance and progress.
* **Implementation:**
  * Trainee roster overview displaying target hours, rendered hours, progress percentages, and pending shifts.
  * Shift inspection view highlighting geofence compliance badges (Inside Perimeter vs Outside Perimeter distance).
  * One-click "Verify Record" action with optional supervisor feedback remarks.

### 2.7 Guest Browser Storage & Cloud Synchronization
* **Purpose:** Allows guests to test and use all core functions locally, with seamless cloud synchronization upon registration.
* **Implementation:**
  * `guestStore.ts` stores workplace settings, attendance records, activity logs, and reports in `localStorage`.
  * When a guest trainee creates an account or logs in, `api.cloudSync.syncGuestToCloud()` automatically uploads their local settings and activity logs to the PostgreSQL cloud database.

### 2.8 Progressive Web Application (PWA) Support
* **Purpose:** Provides an installable, app-like experience on Android, iOS, and desktop browsers.
* **Implementation:**
  * Configured with `vite-plugin-pwa` and Workbox.
  * Web app manifest with standalone display, theme colors, and icons.
  * Service worker caching precaches the application shell for instant offline loading.

---

## 3. Database Schema (PostgreSQL + EF Core)

* **`Users`**: `Id` (UUID), `Email`, `PasswordHash`, `FullName`, `StudentId`, `Role`, `SupervisorId`, `CreatedAt`.
* **`OjtSettings`**: `Id` (UUID), `UserId` (UUID), `CompanyName`, `WorkplaceLatitude`, `WorkplaceLongitude`, `GeofenceRadiusMeters`, `GpsAccuracyThreshold`, `TargetTotalHours`, `DailyScheduleHours`, `DefaultLunchMinutes`.
* **`AttendanceRecords`**: `Id` (UUID), `UserId` (UUID), `Date`, `TimeIn`, `TimeInLatitude`, `TimeInLongitude`, `TimeInDistance`, `TimeInGpsAccuracy`, `TimeInWithinGeofence`, `TimeOut`, `TimeOutLatitude`, `TimeOutLongitude`, `TimeOutDistance`, `TimeOutGpsAccuracy`, `TimeOutWithinGeofence`, `LunchBreakMinutes`, `NetRenderedHours`, `IsVerified`, `VerifiedAt`, `VerifiedBySupervisorId`, `SupervisorRemark`.
* **`ActivityLogs`**: `Id` (UUID), `UserId` (UUID), `Date`, `TaskTitle`, `Details`, `HoursSpent`, `Category`, `CreatedAt`.
* **`GeneratedReports`**: `Id` (UUID), `UserId` (UUID), `ReportType`, `StartDate`, `EndDate`, `AiGeneratedContent`, `EditedContent`, `CreatedAt`.

---

## 4. Configuration & Deployment

### Database Service (Docker Compose)
To start the PostgreSQL database instance locally:
```bash
docker compose up -d
```
Connection string: `Host=localhost;Port=5434;Database=ojthub;Username=postgres;Password=postgres`

### Backend Server
```bash
dotnet run --project server/OJTHub.Server
```
Listens on: `http://localhost:5209`

### Frontend Client
```bash
cd client
npm run dev
```
Listens on: `http://localhost:5173`
