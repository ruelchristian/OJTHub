# OJTHub System Architecture & Feature Guide

This document details the architecture, design choices, and feature implementations of **OJTHub: Geofenced OJT Attendance, AI-Assisted Reporting, and Customizable OJT Management Progressive Web Application**.

---

## 1. System Overview & Architecture

OJTHub is designed as a modern, decoupled web application composed of:
1. **Frontend Client:** A high-performance **React.js + Vite + Tailwind CSS** Progressive Web Application (PWA).
2. **Backend API:** An **ASP.NET Core .NET 10 LTS Minimal API** service.
3. **Relational Database:** **PostgreSQL** for cloud production (Render/Railway/Supabase), with **SQLite** configured for frictionless local student development.
4. **AI Integration:** **Google Gemini API** (`gemini-1.5-flash`) for automated draft synthesis of daily standup and narrative journal reports.

### The System Analogy
To understand how the layers interact without complex technical jargon:
* **The PWA Frontend** is like a **Student's Smartphone Badge**: Always accessible, responsive, and keeps working even in elevator corridors where cell reception drops.
* **The JWT Token** is like an **Encrypted Digital Keycard**: Once the student or supervisor logs in at the front desk, this keycard opens the doors they have permission to access.
* **The ASP.NET Core Backend** is the **Front Desk & Concierge**: It verifies keycards, measures distances to ensure the student is on company premises, records exact time stamps, and directs requests.
* **The Gemini AI Service** is the **Specialist Documentation Assistant**: It reads bulleted notes written by the trainee and formats them into formal, executive-ready reports.
* **The Database** is the **Secure Vault**: Storing unalterable records of attendance, hours, and supervisor sign-offs.

---

## 2. Core Implemented Features

### 2.1 Geofenced Attendance Engine
* **Purpose:** Ensures trainee attendance records reflect physical proximity to the assigned workplace.
* **Implementation:**
  * Uses the browser `navigator.geolocation` API to capture latitude, longitude, and device GPS accuracy.
  * **Accuracy Gate:** Readings with accuracy errors exceeding the configured threshold (default: 50 meters) are flagged or blocked with clear user prompts to move near windows or outdoors.
  * **Server-Side Distance Verification:** The backend uses the **Haversine formula** to calculate exact meter-level distance between trainee device coordinates and configured workplace coordinates (`WorkplaceLatitude`, `WorkplaceLongitude`). The server does not trust client boolean flags.
  * **Shift State Machine:** Prevents duplicate Time-In actions while a shift is open, and prohibits Time-Out without an active Time-In.
  * **Timestamp Integrity:** Shift start and end times are recorded using server-side UTC timestamps (`DateTimeOffset.UtcNow`), neutralizing device clock manipulation.

### 2.2 Automated Hours Calculation Engine
* **Purpose:** Eliminates manual calculation errors in Daily Time Records.
* **Implementation:**
  * Calculates daily net hours: `(TimeOut - TimeIn) - LunchBreakMinutes`.
  * For shifts under 4 hours, lunch break is automatically exempted.
  * Dynamically computes cumulative rendered hours, remaining required hours, percentage completion, and total days rendered.

### 2.3 Daily Activity Logging
* **Purpose:** Enables continuous, categorized task documentation for trainees.
* **Implementation:**
  * CRUD endpoints at `/api/activities`.
  * Allows logging task headlines, hours spent, categories (Development, Testing, Documentation, Meetings, Support, etc.), and accomplishments.

### 2.4 AI-Assisted Reporting (Google Gemini API)
* **Purpose:** Automates the creation of polished End-of-Day (EOD) standup summaries and narrative journals.
* **Implementation:**
  * Endpoint `POST /api/reports/ai-generate`.
  * Aggregates activity entries across the selected date range.
  * Formats an engineered prompt and communicates securely with the Google Gemini API using server-side credentials.
  * **Human-in-the-loop Review:** The trainee reviews and edits the AI-generated draft in the frontend workspace before saving.
  * **Multi-Format Export:** Supports one-click copy to Markdown and Slack/Discord chat formatting.

### 2.5 Printable PDF Daily Time Record (DTR)
* **Purpose:** Produces official, institutional-grade DTR documents ready for printing and supervisor physical or digital submission.
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

### 2.7 Progressive Web Application (PWA) Support
* **Purpose:** Provides an installable, app-like experience on Android, iOS, and desktop browsers.
* **Implementation:**
  * Configured with `vite-plugin-pwa` and Workbox.
  * Web app manifest with standalone display, theme colors, and icons.
  * Service worker caching precaches the application shell for instant offline loading.

---

## 3. Database Schema

* **`Users`**: `Id`, `Email`, `PasswordHash`, `FullName`, `StudentId`, `Role`, `SupervisorId`, `CreatedAt`.
* **`OjtSettings`**: `Id`, `UserId`, `CompanyName`, `WorkplaceLatitude`, `WorkplaceLongitude`, `GeofenceRadiusMeters`, `GpsAccuracyThreshold`, `TargetTotalHours`, `DailyScheduleHours`, `DefaultLunchMinutes`.
* **`AttendanceRecords`**: `Id`, `UserId`, `Date`, `TimeIn`, `TimeInLatitude`, `TimeInLongitude`, `TimeInDistance`, `TimeInGpsAccuracy`, `TimeInWithinGeofence`, `TimeOut`, `TimeOutLatitude`, `TimeOutLongitude`, `TimeOutDistance`, `TimeOutGpsAccuracy`, `TimeOutWithinGeofence`, `LunchBreakMinutes`, `NetRenderedHours`, `IsVerified`, `VerifiedAt`, `VerifiedBySupervisorId`, `SupervisorRemark`.
* **`ActivityLogs`**: `Id`, `UserId`, `Date`, `TaskTitle`, `Details`, `HoursSpent`, `Category`, `CreatedAt`.
* **`GeneratedReports`**: `Id`, `UserId`, `ReportType`, `StartDate`, `EndDate`, `RawPromptData`, `AiGeneratedContent`, `EditedContent`, `CreatedAt`.

---

## 4. Configuration & Deployment

### Environment Variables
* `ASPNETCORE_ENVIRONMENT`: `Development` or `Production`
* `DatabaseProvider`: `PostgreSQL` (or `Sqlite` for local dev)
* `ConnectionStrings__DefaultConnection`: PostgreSQL or SQLite connection string
* `Jwt__SecretKey`: Cryptographic secret key (min 32 bytes)
* `Gemini__ApiKey`: Google Gemini API key (or `GEMINI_API_KEY`)
