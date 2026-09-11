# OJTHub Implementation Plan

**Project:** OJTHub — Geofenced OJT Attendance, AI-Assisted Reporting, and Customizable OJT Management Progressive Web Application  
**Primary Source of Truth:** [Proposal-4_OJTHub.docx](file:///E:/OJTHub/Proposal-4_OJTHub.docx)  
**Target Platform:** Progressive Web Application (PWA) — Mobile & Desktop Web  
**Technology Stack:** React.js (Vite) + Tailwind CSS | ASP.NET Core .NET 10 Minimal API (C#) | PostgreSQL + EF Core | Google Gemini API  

---

## 1. Requirements Analysis

### 1.1 Functional Requirements (FR)
* **FR-01 (User Authentication):** System must allow Trainees and Supervisors to register and log in. Secure digital keycards (JWT tokens) will identify logged-in users.
* **FR-02 (Role-Based Access Control):** Trainees have access to attendance recording, activity logs, AI report generation, and DTR creation. Supervisors have access to a read-only review and verification portal for assigned trainees.
* **FR-03 (OJT Configuration):** Trainees or authorized users can configure workplace GPS coordinates (latitude, longitude), geofence allowed radius (in meters), required target OJT hours (e.g., 300 to 600 hours), standard daily schedule, and default lunch/break deductions.
* **FR-04 (Geofenced Attendance Recording):** Trainees record Time-In and Time-Out using device geolocation. The system calculates physical distance to the workplace using the Haversine formula and checks whether the trainee is within the authorized perimeter.
* **FR-05 (GPS Accuracy & State Validation):** Attendance actions are rejected if GPS accuracy does not meet the configured threshold (e.g., accuracy > 50 meters indicates weak satellite signal). The system also enforces a strict state machine: Time-Out requires an active Time-In; duplicate Time-In on an open shift is prevented.
* **FR-06 (Automated Hours Engine):** Calculates daily net training hours (subtracting break/lunch policies), cumulative hours rendered, remaining hours required, percentage completion, and projected OJT completion date based on weekly schedule.
* **FR-07 (Attendance History & Calendar):** Provides a visual calendar and historical list view showing daily logs, timestamps, recorded location tags, and verification statuses.
* **FR-08 (Daily Activity & Accomplishment Logging):** Trainees can create, edit, and delete activity entries (task descriptions, accomplishments, learning takeaways, notes) tied to specific dates.
* **FR-09 (AI-Assisted Report & Journal Drafting):** Backend connects to the Google Gemini API to transform raw activity logs into polished daily standup/End-of-Day (EOD) summaries and reflective date-range narrative journals.
* **FR-10 (Human Review & Multi-Format Export):** AI-generated drafts are fully editable in the frontend before saving. Content can be exported in Markdown, chat message format (Slack/Discord), and formal email/memo format.
* **FR-11 (PDF DTR Generation):** Client-side generation of standardized, print-ready Daily Time Record (DTR) sheets using `jsPDF` and `jsPDF-AutoTable`, complete with trainee metadata, date/time breakdown, total hours, and supervisor signature boxes.
* **FR-12 (Guest Mode & Cloud Sync):** Unauthenticated guest trainees can record logs locally in browser storage (IndexedDB/LocalStorage). Upon account registration/login, local records can be migrated and synchronized to cloud storage (PostgreSQL).
* **FR-13 (Supervisor Verification):** Supervisors can inspect trainee attendance entries, audit geofence flags, review logged accomplishments, and mark records as "Verified" with optional supervisor comments.

### 1.2 Non-Functional Requirements (NFR)
* **NFR-01 (Performance):** Core API responses (attendance recording, hours computation) must respond within < 300ms under standard network conditions. Client-side PWA loads within < 2 seconds on mobile networks.
* **NFR-02 (Offline Capability & Reliability):** Service worker caching enables shell access, offline logging, and local data persistence when mobile network connectivity drops during transit.
* **NFR-03 (Responsiveness & Usability):** Responsive UI works seamlessly on mobile phone screens (portrait viewport 360px+) and desktop monitors, following modern touch target guidelines (min 44x44px).
* **NFR-04 (Maintainability & Simplicity):** Clean separation of concerns between presentation and backend services using idiomatic ASP.NET Core Minimal APIs, EF Core repositories, and modular React components.
* **NFR-05 (Scalability):** Stateless JWT authentication and relational PostgreSQL schema suitable for student cohorts and easy cloud hosting on free/hobby tiers (Render/Railway/Vercel).

### 1.3 User Requirements
* Trainees require a single, fast tap to log attendance without carrying paper timecards.
* Trainees need clear visual confirmation whether they are inside or outside the workplace geofence radius.
* Trainees need automated hour totals so they never miscalculate required vs completed hours.
* Supervisors need a quick, organized web dashboard to verify student hours without reviewing handwritten logbooks.

### 1.4 System Requirements
* Server: .NET 10 LTS SDK, ASP.NET Core Web API runtime.
* Database: PostgreSQL 15+ (hosted on Render, Railway, or Supabase).
* Client: Modern web browser supporting HTML5 Geolocation API, Web App Manifest, Service Workers, and ECMAScript 2022+.
* Build Tools: Node.js 20+, npm/pnpm, Vite 5+.

### 1.5 Security Requirements
* Passwords hashed using standard cryptographic algorithms (`BCrypt` or ASP.NET Core `IPasswordHasher` using PBKDF2 with HMAC-SHA256).
* Stateless JWT authorization keycards with short expiration times and secure claim payloads.
* Server-side coordinates and distance recalculation (backend re-verifies geofence distance and does not trust client boolean flags).
* Parameterized EF Core database queries preventing SQL Injection.
* Strict input validation and sanitization preventing Cross-Site Scripting (XSS).
* Gemini API key stored strictly in backend server environment variables, never exposed to the frontend browser.

### 1.6 Data Requirements
* Relational integrity: Attendance logs, activity notes, and OJT configurations must be tied to a valid `UserId`.
* Precision: GPS coordinates stored with decimal precision `decimal(9,6)` to ensure meter-level accuracy.
* Timestamps: All database audit dates stored in UTC (`timestamptz`). Displayed converted to user local timezone.

### 1.7 Requirements Traceability Matrix

| ID | Requirement | User | Priority | Proposed Implementation | Related Module |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | User Registration & Login | Trainee, Supervisor | Must Have | ASP.NET Core Minimal API + JWT + BCrypt hashing | User Management |
| **REQ-02** | Role-Based Access Control | Trainee, Supervisor | Must Have | ASP.NET Core Authorization policies (`RequireRole`) | User Management |
| **REQ-03** | Trainee OJT Settings Setup | Trainee | Must Have | Settings page + EF Core `OjtSetting` model | OJT Configuration |
| **REQ-04** | Geofenced Time-In/Time-Out | Trainee | Must Have | HTML5 Geolocation + Haversine formula calculation | Attendance |
| **REQ-05** | GPS Accuracy & State Check | Trainee | Must Have | State machine verification in `AttendanceService` | Attendance |
| **REQ-06** | Daily Net & Accumulated Hours | Trainee, Supervisor | Must Have | Server & Client `HoursEngine` calculation logic | Hours Engine |
| **REQ-07** | Attendance History & Calendar | Trainee, Supervisor | Must Have | React Calendar + Filterable Table view | Attendance |
| **REQ-08** | Activity & Accomplishment Log | Trainee | Must Have | CRUD endpoints + Form components with tags | Activity Management |
| **REQ-09** | AI Daily & Journal Generation | Trainee | Must Have | Backend Gemini API client (`google-genai` integration) | AI Reporting |
| **REQ-10** | Editable Multi-Format Export | Trainee | Should Have | React markdown/clipboard export utility | Reporting & Export |
| **REQ-11** | Printable PDF DTR Generation | Trainee, Supervisor | Must Have | `jsPDF` + `jsPDF-AutoTable` layout builder | Documents / DTR |
| **REQ-12** | Guest Mode & Cloud Sync | Trainee | Should Have | IndexedDB Dexie/LocalStorage store + Sync API | Data Management |
| **REQ-13** | Supervisor Record Verification | Supervisor | Must Have | Supervisor portal: trainees list, approval button | Supervisor Portal |

---

## 2. System Modules

### Module 1: User Management & Authentication
* **Purpose:** Handles account onboarding, credential authentication, user profiles, and role separation.
* **Main Users:** OJT Trainees, Supervisors/Instructors.
* **Features:** Account registration with role selection (Trainee/Supervisor), login with JWT token issuance, profile management (name, school/company, avatar/initials), password update.
* **Inputs:** Email, Password, Full Name, Student/Trainee ID, Role.
* **Outputs:** JWT access token, user profile data, authorization state.
* **Dependencies:** ASP.NET Core Authentication, PostgreSQL.
* **Database Entities Involved:** `User`.

### Module 2: OJT Configuration & Settings
* **Purpose:** Stores personalized internship rules and geofence boundary parameters.
* **Main Users:** OJT Trainees (or Supervisors setting boundaries for their trainees).
* **Features:** Company/Workplace name configuration, GPS pinpointing (latitude & longitude), geofence allowed radius (default: 100 meters), target required hours (default: 300/486/600 hours), standard daily schedule (e.g., 8:00 AM - 5:00 PM), default lunch deduction (e.g., 60 mins).
* **Inputs:** Latitude, Longitude, Radius (meters), Target Hours, Shift Schedule, Lunch Break duration.
* **Outputs:** Configuration profile object, geofence radius circle coordinates.
* **Dependencies:** User Management, HTML5 Geolocation (for "Use My Current Location" button).
* **Database Entities Involved:** `OjtSetting`.

### Module 3: Geofenced Attendance
* **Purpose:** Captures and validates trainee attendance with location-based verification.
* **Main Users:** OJT Trainees.
* **Features:** One-tap Time-In and Time-Out, device GPS coordinate capture, accuracy threshold validation (< 50m), Haversine distance verification against target workplace coordinates, duplicate action guard, attendance status feedback (Inside Perimeter / Outside Perimeter).
* **Inputs:** Trainee device GPS coordinates (lat, lng, accuracy), shift action (TimeIn, TimeOut), optional trainee remark/note.
* **Outputs:** Attendance record receipt, validation status (success/failure reason), computed distance.
* **Dependencies:** OJT Configuration, HTML5 Geolocation API, Hours Engine.
* **Database Entities Involved:** `AttendanceRecord`.

### Module 4: Hours Engine & Progress Tracker
* **Purpose:** Automatically calculates and audits daily training hours and milestones.
* **Main Users:** OJT Trainees, Supervisors.
* **Features:** Daily net hours computation (Time-Out minus Time-In minus break deduction), total accumulated hours counter, remaining hours counter, completion progress percentage bar, estimated completion date projection based on active shift rate.
* **Inputs:** Raw attendance records, target hours configuration, weekly schedule rules.
* **Outputs:** Daily net hours, total rendered hours, remaining hours, progress percentage, projected finish date.
* **Dependencies:** Attendance Module, OJT Configuration.
* **Database Entities Involved:** `AttendanceRecord`, `OjtSetting`.

### Module 5: Daily Activity & Accomplishment Logging
* **Purpose:** Allows trainees to maintain an active logbook of tasks completed during their training.
* **Main Users:** OJT Trainees.
* **Features:** Log entry creation with task title, description, skills used, hours spent, date association, and category tag. Quick review and editing.
* **Inputs:** Date, Task Title, Details, Category/Tags, Duration.
* **Outputs:** Structured activity log feed, task summaries.
* **Dependencies:** User Management, Attendance Module.
* **Database Entities Involved:** `ActivityLog`.

### Module 6: AI-Assisted Reporting & Multi-Format Export
* **Purpose:** Synthesizes raw task entries into polished formal reports using AI.
* **Main Users:** OJT Trainees.
* **Features:** 
  1. *Daily EOD Standup Generator:* Summarizes daily accomplishments, challenges, and next-day plans.
  2. *Weekly/Monthly Journal Generator:* Creates reflective narrative reports over a selected date range.
  3. *Human Editing Workspace:* Rich text/markdown editing before saving or exporting.
  4. *Multi-Format Exporter:* Formats text for Markdown, team chat (Slack/Discord), and formal email.
* **Inputs:** Selected activity log IDs, report type, date range, custom prompt hints.
* **Outputs:** Draft report text, formatted export snippets.
* **Dependencies:** Activity Logging, Google Gemini API via backend proxy.
* **Database Entities Involved:** `GeneratedReport`, `ActivityLog`.

### Module 7: PDF DTR Generation
* **Purpose:** Creates official, printable Daily Time Record documents.
* **Main Users:** OJT Trainees, Supervisors.
* **Features:** Dynamic client-side PDF document creation using `jsPDF` and `jsPDF-AutoTable`. Standard institutional format: Trainee name, school, company, month/year, tabular daily breakdown (Date, Day, Time-In, Lunch Out, Lunch In, Time-Out, Daily Total), cumulative total hours, and supervisor signature blocks.
* **Inputs:** Month/Year selection, trainee profile data, filtered attendance records.
* **Outputs:** Downloadable/printable `.pdf` document.
* **Dependencies:** Attendance Module, Hours Engine.
* **Database Entities Involved:** `AttendanceRecord`, `User`, `OjtSetting`.

### Module 8: Guest Mode & Cloud Synchronization
* **Purpose:** Enables offline trial and seamless migration to authenticated cloud accounts.
* **Main Users:** OJT Trainees.
* **Features:** Stores logs and settings locally in browser IndexedDB when not logged in. Detects un-synced guest records upon registration/login and prompts the user to synchronize/upload records to PostgreSQL cloud storage.
* **Inputs:** Local browser store data, authentication token.
* **Outputs:** Cloud sync confirmation, reconciled database IDs.
* **Dependencies:** User Management, Attendance Module, Activity Module.
* **Database Entities Involved:** All trainee-scoped entities.

### Module 9: Supervisor Verification Portal
* **Purpose:** Gives authorized mentors/instructors visibility into student progress.
* **Main Users:** Supervisors / Instructors.
* **Features:** Trainee roster overview, trainee attendance history review, geofence compliance flags (e.g., flag if logged > 100m outside boundary), activity log inspection, "Verify Records" one-click action, supervisor remarks.
* **Inputs:** Trainee selection, verification approval, supervisor feedback notes.
* **Outputs:** Verified status badge, audit timestamps.
* **Dependencies:** User Management, Attendance Module, Activity Module.
* **Database Entities Involved:** `AttendanceRecord`, `VerificationAudit`.

---

## 3. User Roles and Permissions

### 3.1 Role Definitions
1. **OJT Trainee:** The primary actor who logs attendance, tracks hours, documents daily tasks, generates reports, and prints DTRs.
2. **Supervisor / Instructor:** An evaluative actor who monitors assigned trainees, inspects time records and logs, and signs off on verification.

### 3.2 Permissions Matrix

| Feature / Action | OJT Trainee | Supervisor / Instructor |
| :--- | :---: | :---: |
| Register Account / Log In | Yes | Yes |
| Configure Personal OJT Settings (Coordinates, Target Hours) | Yes | Read-Only |
| Perform Geofenced Time-In / Time-Out | Yes | No |
| View Personal Attendance Records | Yes | Yes (Assigned Trainees) |
| Create / Edit / Delete Activity Logs | Yes | Read-Only |
| Request AI Draft Report (Gemini API) | Yes | No |
| Edit & Export AI Reports | Yes | Read-Only |
| Generate & Download PDF DTR | Yes | Yes |
| Verify / Approve Trainee Attendance Records | No | Yes |
| Add Supervisor Audit Notes to Trainee Logs | No | Yes |
| Manage System Users / Global Database Administration | No (Out of scope) | No (Out of scope) |

---

## 4. System Architecture

### 4.1 Recommended Architecture: Web API + SPA PWA
We recommend a decoupled **Web API (ASP.NET Core Minimal APIs) + Frontend Single-Page Application (React.js PWA)** architecture.

#### Why this architecture is optimal:
1. **PWA Native Experience:** The frontend must act like a mobile app (instant touch interactions, geolocation, service workers, offline capabilities). A decoupled React + Vite SPA provides this native feel without server-rendered page reloads.
2. **Clean Boundary & Security:** The ASP.NET Core backend acts as a secure gatekeeper. The Gemini API key and database credentials stay protected on the server.
3. **Simplicity & Performance:** Minimal APIs in .NET 10 eliminate MVC controller ceremony, resulting in lightweight, high-speed endpoints with built-in OpenAPI/Swagger docs.
4. **Low Cost / Free Tier Compatible:** The frontend static bundle can be deployed globally for free on Vercel/Netlify, while the backend API and PostgreSQL database run efficiently on Render or Railway.

### 4.2 Architecture Analogy
Think of this architecture like a **Hotel System**:
* The **Frontend PWA** is the guest's **Smartphone App** in their hand — fast, interactive, and works even when walking through elevators with weak signal.
* The **JWT Token** is a secure **Digital Keycard** given at check-in that grants access to specific doors.
* The **ASP.NET Core Backend** is the **Front Desk & Concierge** — validating credentials, checking perimeters, and handling requests.
* The **Gemini API** is the **Specialist Copywriter** the concierge calls when the guest needs an official report prepared.
* The **PostgreSQL Database** is the secure **Hotel Vault** where permanent records are stored.

### 4.3 Textual Architecture Diagram

```text
┌────────────────────────────────────────────────────────┐
│               Client Device (Mobile / Desktop)         │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │             React.js + Vite PWA                  │  │
│  │  - UI: Tailwind CSS Design Tokens                │  │
│  │  - Offline Store: IndexedDB (Guest Mode)         │  │
│  │  - Device APIs: HTML5 Geolocation                │  │
│  │  - Document Builder: jsPDF + jsPDF-AutoTable     │  │
│  │  - Service Worker: Caching & Install Prompts     │  │
│  └────────────────────────┬─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │ HTTPS / REST (JSON + JWT Bearer)
┌───────────────────────────▼────────────────────────────┐
│         Backend Server: ASP.NET Core (.NET 10)         │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Presentation / Endpoints            │  │
│  │  - Minimal API Route Groups (/api/auth, /api/dtr)│  │
│  │  - OpenAPI / Swagger Metadata & Documentation    │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │              Application / Business Logic        │  │
│  │  - AttendanceService (Geofence, State Validation)│  │
│  │  - HoursCalculationEngine (Net & Projected Hours)│  │
│  │  - GeminiReportService (AI Prompt Engineering)   │  │
│  │  - TokenService & AuthMiddleware                 │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │              Data Access Layer                   │  │
│  │  - Entity Framework Core 10 (OJTHubDbContext)    │  │
│  │  - LINQ Query Optimizations & Migrations         │  │
│  └────────────────────────┬─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
  ┌───────────────────────┐   ┌───────────────────────┐
  │  PostgreSQL Database  │   │   Google Gemini API   │
  │  (Relational Storage) │   │  (AI Text Generation) │
  └───────────────────────┘   └───────────────────────┘
```

---

## 5. Database Design

### 5.1 Initial Database Schema Table

| Entity | Field | Data Type | Key | Nullable | Description |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **User** | `Id` | `UUID` | PK | No | Unique user identifier |
| | `Email` | `VARCHAR(150)` | UK | No | User login email address |
| | `PasswordHash` | `VARCHAR(255)` | | No | Cryptographically hashed password |
| | `FullName` | `VARCHAR(100)` | | No | Trainee or Supervisor full name |
| | `StudentId` | `VARCHAR(50)` | | Yes | Institutional student/trainee ID |
| | `Role` | `VARCHAR(20)` | | No | 'Trainee' or 'Supervisor' |
| | `SupervisorId` | `UUID` | FK | Yes | Self-referencing FK linking Trainee to Supervisor |
| | `CreatedAt` | `TIMESTAMPTZ` | | No | Account creation timestamp (UTC) |
| **OjtSetting** | `Id` | `UUID` | PK | No | Unique settings record ID |
| | `UserId` | `UUID` | FK, UK| No | Associated Trainee user ID |
| | `CompanyName` | `VARCHAR(150)` | | No | Training institution/company name |
| | `WorkplaceLatitude` | `DECIMAL(9,6)`| | No | Configured workplace GPS latitude |
| | `WorkplaceLongitude`| `DECIMAL(9,6)`| | No | Configured workplace GPS longitude |
| | `GeofenceRadiusMeters`| `INT` | | No | Allowed radius in meters (e.g., 100) |
| | `GpsAccuracyThreshold`| `INT` | | No | Max acceptable GPS accuracy in meters (e.g., 50) |
| | `TargetTotalHours` | `DECIMAL(5,1)`| | No | Total required training hours (e.g., 486.0) |
| | `DailyScheduleHours`| `DECIMAL(4,1)`| | No | Expected daily hours (e.g., 8.0) |
| | `DefaultLunchMinutes`| `INT` | | No | Auto-deducted lunch break duration (e.g., 60) |
| **AttendanceRecord** | `Id` | `UUID` | PK | No | Unique attendance log identifier |
| | `UserId` | `UUID` | FK | No | Foreign key referencing Trainee |
| | `Date` | `DATE` | | No | Shift calendar date (YYYY-MM-DD) |
| | `TimeIn` | `TIMESTAMPTZ` | | No | Time-In timestamp (UTC) |
| | `TimeInLatitude` | `DECIMAL(9,6)`| | No | Trainee GPS latitude at Time-In |
| | `TimeInLongitude` | `DECIMAL(9,6)`| | No | Trainee GPS longitude at Time-In |
| | `TimeInDistance` | `DECIMAL(6,1)`| | No | Calculated distance from workplace (meters) |
| | `TimeInGpsAccuracy` | `DECIMAL(5,1)`| | No | Device-reported GPS accuracy (meters) |
| | `TimeInWithinGeofence`| `BOOLEAN` | | No | Flag indicating if within allowed radius |
| | `TimeOut` | `TIMESTAMPTZ` | | Yes | Time-Out timestamp (UTC) |
| | `TimeOutLatitude` | `DECIMAL(9,6)`| | Yes | Trainee GPS latitude at Time-Out |
| | `TimeOutLongitude`| `DECIMAL(9,6)`| | Yes | Trainee GPS longitude at Time-Out |
| | `TimeOutDistance` | `DECIMAL(6,1)`| | Yes | Distance from workplace at Time-Out |
| | `TimeOutGpsAccuracy`| `DECIMAL(5,1)`| | Yes | Device-reported GPS accuracy at Time-Out |
| | `TimeOutWithinGeofence`| `BOOLEAN`| | Yes | Flag indicating if within allowed radius |
| | `LunchBreakMinutes`| `INT` | | No | Deducted break time (default: 60 or custom) |
| | `NetRenderedHours` | `DECIMAL(4,2)`| | Yes | Computed net work hours for the shift |
| | `IsVerified` | `BOOLEAN` | | No | Supervisor verification status (default: false) |
| | `VerifiedAt` | `TIMESTAMPTZ` | | Yes | Timestamp of verification |
| | `VerifiedBySupervisorId`| `UUID` | FK | Yes | ID of supervisor who verified |
| | `SupervisorRemark`| `VARCHAR(255)`| | Yes | Feedback or notes from supervisor |
| **ActivityLog** | `Id` | `UUID` | PK | No | Unique activity entry ID |
| | `UserId` | `UUID` | FK | No | Foreign key referencing Trainee |
| | `Date` | `DATE` | | No | Log activity date |
| | `TaskTitle` | `VARCHAR(150)` | | No | Brief headline of task performed |
| | `Details` | `TEXT` | | No | Detailed description and learnings |
| | `HoursSpent` | `DECIMAL(3,1)`| | Yes | Approximate time devoted to task |
| | `Category` | `VARCHAR(50)` | | Yes | Tag (e.g., Development, Meeting, Testing) |
| | `CreatedAt` | `TIMESTAMPTZ` | | No | Creation timestamp |
| **GeneratedReport** | `Id` | `UUID` | PK | No | Unique report record ID |
| | `UserId` | `UUID` | FK | No | Trainee who generated the report |
| | `ReportType` | `VARCHAR(30)` | | No | 'EOD_Standup' or 'Journal_Narrative' |
| | `StartDate` | `DATE` | | No | Scope start date |
| | `EndDate` | `DATE` | | No | Scope end date |
| | `RawPromptData` | `TEXT` | | Yes | Aggregated activity text sent to AI |
| | `AiGeneratedContent`| `TEXT` | | No | Original response from Gemini |
| | `EditedContent` | `TEXT` | | Yes | Human-modified content after trainee review |
| | `CreatedAt` | `TIMESTAMPTZ` | | No | Generation timestamp |

### 5.2 Relationship Explanations
* **One-to-One (`User` to `OjtSetting`):** Each trainee has exactly one configuration profile storing their workplace location, target hours, and schedule.
* **One-to-Many (`User` to `AttendanceRecord`):** A trainee records multiple daily attendance shifts over their training duration.
* **One-to-Many (`User` to `ActivityLog`):** A trainee creates multiple activity notes across their internship.
* **One-to-Many (`User` to `GeneratedReport`):** A trainee can generate multiple EOD summaries and periodic journal narratives.
* **Self-Referencing Many-to-One (`User` to `User`):** Multiple trainees can be assigned to one Supervisor (`SupervisorId`).

### 5.3 Referential Integrity & Database Constraints
* `ON DELETE CASCADE` applied on `OjtSetting`, `AttendanceRecord`, `ActivityLog`, and `GeneratedReport` when a `User` is deleted.
* Unique Constraint on `AttendanceRecord(UserId, Date)` preventing duplicate attendance records on the exact same date (or enforces an open/closed shift status).
* Range checks: Latitude between `-90` and `+90`, Longitude between `-180` and `+180`, `NetRenderedHours >= 0`.

---

## 6. Application Workflow

### 6.1 Trainee Daily Attendance Workflow
1. Trainee opens the OJTHub PWA on their mobile or desktop browser.
2. Trainee taps **"Time-In"**.
3. Browser requests device geolocation via HTML5 Geolocation API.
4. Client checks GPS accuracy:
   * If GPS accuracy > 50 meters, user is notified that the location signal is too weak, and is prompted to retry.
5. Client sends current coordinates to `POST /api/attendance/time-in`.
6. Backend verifies:
   * Trainee has no unresolved open shift today.
   * Calculates Haversine distance between trainee coordinates and workplace coordinates stored in `OjtSetting`.
   * Flags whether trainee is within `GeofenceRadiusMeters`.
7. Backend saves the `AttendanceRecord` with timestamp and returns the result.
8. Dashboard UI updates the attendance status chip to **"Active Shift"** and begins counting elapsed time.
9. At shift completion, trainee taps **"Time-Out"**.
10. System validates that an active Time-In exists, verifies GPS location, computes `NetRenderedHours` (total elapsed minus lunch break), and stores the completed shift.

### 6.2 Trainee Activity Logging & AI Reporting Workflow
1. Trainee accesses the **Activity Log** screen.
2. Trainee logs 2–4 bulleted tasks completed during the day with hours spent.
3. Trainee taps **"Generate AI Report"** and selects either **EOD Standup** (Daily) or **Narrative Journal** (Date range).
4. Backend retrieves the activity entries within the requested date range, formats an engineered prompt, and sends the request to the Google Gemini API.
5. Gemini returns a structured draft (Accomplishments, Blockers, Lessons Learned).
6. Frontend opens the **Review & Edit Workspace**:
   * Trainee reviews the text, corrects terminology, or adds personal reflections.
7. Trainee taps **"Copy as Markdown"**, **"Copy for Slack"**, or **"Save to My Reports"**.

### 6.3 PDF DTR Export Workflow
1. Trainee opens the **DTR Documents** tab.
2. Trainee selects the target month (e.g., September 2026).
3. Client fetches all verified and recorded attendance entries for the selected month.
4. `jsPDF` formats an official document header (Trainee Name, Company, Required Hours, Month).
5. `jsPDF-AutoTable` renders the table of days with Time-In, Lunch In/Out, Time-Out, and Daily Total hours.
6. Footer calculates the grand accumulated hours and renders formal signature lines for the Trainee and Company Supervisor.
7. Trainee downloads or prints the `.pdf` file.

### 6.4 Supervisor Review Workflow
1. Supervisor logs into the portal.
2. Supervisor sees a list of assigned trainees with summary progress bars (e.g., "Juan Dela Cruz: 240 / 486 Hours - 49%").
3. Supervisor clicks into a trainee's attendance sheet.
4. Entries with geofence warnings (e.g., Time-In logged 120m away) are highlighted with an amber indicator.
5. Supervisor reviews the corresponding activity logs and clicks **"Verify Record"**.
6. System marks the record as verified with the supervisor's ID and timestamp.

---

## 7. API Design

All endpoints follow RESTful conventions, prefixed with `/api`. Responses return standard JSON with RFC 7807 Problem Details for errors.

| Method | Endpoint | Purpose | Role | Request Body | Response Body |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Register new user | Public | `{ email, password, fullName, studentId, role }` | `{ token, user }` |
| **POST** | `/api/auth/login` | Authenticate user | Public | `{ email, password }` | `{ token, user }` |
| **GET** | `/api/auth/me` | Get current user profile | Trainee, Sup | None | `{ id, email, fullName, role }` |
| **GET** | `/api/settings` | Get trainee OJT configuration | Trainee, Sup | None | `{ companyName, lat, lng, radius, targetHours, ... }` |
| **PUT** | `/api/settings` | Update trainee OJT configuration | Trainee | `{ companyName, lat, lng, radius, targetHours, ... }` | `{ success: true, updatedSettings }` |
| **POST** | `/api/attendance/time-in` | Record daily Time-In | Trainee | `{ latitude, longitude, accuracy }` | `{ recordId, timeIn, distance, withinGeofence }` |
| **POST** | `/api/attendance/time-out`| Record daily Time-Out | Trainee | `{ latitude, longitude, accuracy, customLunchMins }` | `{ recordId, timeOut, netHours, totalHours }` |
| **GET** | `/api/attendance/status` | Get current day attendance state | Trainee | None | `{ hasActiveShift, todayRecord }` |
| **GET** | `/api/attendance/history`| List historical attendance logs | Trainee, Sup | Query params: `month`, `year` | `[ { date, timeIn, timeOut, netHours, isVerified } ]` |
| **GET** | `/api/hours/summary` | Get computed hours progress | Trainee, Sup | None | `{ targetHours, renderedHours, remainingHours, percent, estFinishDate }` |
| **GET** | `/api/activities` | List logged activities | Trainee, Sup | Query params: `startDate`, `endDate` | `[ { id, date, taskTitle, details, category } ]` |
| **POST** | `/api/activities` | Create daily activity entry | Trainee | `{ date, taskTitle, details, hoursSpent, category }` | `{ id, taskTitle, ... }` |
| **PUT** | `/api/activities/{id}` | Update activity entry | Trainee | `{ taskTitle, details, hoursSpent, category }` | `{ updatedActivity }` |
| **DELETE**| `/api/activities/{id}` | Remove activity entry | Trainee | None | `204 No Content` |
| **POST** | `/api/reports/ai-generate`| Generate AI EOD or Journal draft| Trainee | `{ reportType, startDate, endDate, customNotes }` | `{ draftText, referencedActivityCount }` |
| **POST** | `/api/reports` | Save reviewed report | Trainee | `{ reportType, startDate, endDate, finalContent }` | `{ reportId, savedAt }` |
| **GET** | `/api/reports` | List saved reports | Trainee, Sup | Query params: `reportType` | `[ { id, reportType, startDate, endDate, ... } ]` |
| **POST** | `/api/sync/guest` | Migrate guest browser data | Trainee | `{ settings, attendanceList, activityList }` | `{ syncedCount, status: 'Success' }` |
| **GET** | `/api/supervisor/trainees`| Get list of assigned trainees | Supervisor | None | `[ { traineeId, name, studentId, renderedHours, targetHours } ]` |
| **POST** | `/api/supervisor/verify` | Verify trainee attendance record| Supervisor | `{ attendanceRecordId, remark }` | `{ verifiedAt, status: 'Verified' }` |

---

## 8. Frontend / Page Structure

The React PWA uses a clean, mobile-first layout with bottom navigation on mobile devices and a responsive sidebar on desktop screens.

### Page 1: Login & Registration (`/login`, `/register`)
* **Purpose:** User onboarding and secure access.
* **UI Components:** Tabbed Auth Card, Form Inputs with instant validation, Role Selector toggle (Trainee / Supervisor), "Continue as Guest" link.
* **User Actions:** Submit login/registration, navigate to guest mode.
* **API Interactions:** `POST /api/auth/login`, `POST /api/auth/register`.

### Page 2: Dashboard / Punch Clock (`/dashboard` or `/`)
* **Purpose:** Primary screen for attendance actions and daily status.
* **UI Components:**
  * Interactive Geofence Status Indicator (Green = Inside Perimeter, Amber = Outside, Gray = Locating).
  * Big Action Button: "TIME IN" (when shift not started) or "TIME OUT" (when shift active).
  * Real-time Shift Stopwatch (showing active shift elapsed time).
  * Summary Cards: Total Hours Rendered, Remaining Hours, Percentage Circle.
  * Workplace Distance readout (e.g., "34 meters from Workplace").
* **User Actions:** Tap Time-In / Time-Out, view location permission prompts, retry GPS.
* **API Interactions:** `GET /api/attendance/status`, `POST /api/attendance/time-in`, `POST /api/attendance/time-out`, `GET /api/hours/summary`.

### Page 3: Attendance History & Calendar (`/attendance`)
* **Purpose:** Reviewing past attendance records.
* **UI Components:** Calendar View toggle / Table List View toggle, Month Selector, Status Chips (Verified, Pending, Outside Geofence).
* **Data Displayed:** Date, Time-In, Time-Out, Net Hours, Geofence Distance, Supervisor verification badge.
* **User Actions:** Filter by month/status, click on record to view details.
* **API Interactions:** `GET /api/attendance/history`.

### Page 4: Daily Activity Logs (`/activities`)
* **Purpose:** Documenting tasks and accomplishments.
* **UI Components:** "Add New Activity" Floating Action Button / Modal, Timeline list of daily tasks categorized with color-coded badges, Date picker.
* **User Actions:** Create, edit, and delete activity items.
* **API Interactions:** `GET /api/activities`, `POST /api/activities`, `PUT /api/activities/{id}`, `DELETE /api/activities/{id}`.

### Page 5: AI Report & Journal Generator (`/reports`)
* **Purpose:** Transforming daily tasks into polished reports.
* **UI Components:**
  * Report Selector (End-of-Day Standup vs Weekly/Monthly Journal).
  * Date Range Picker.
  * "Generate with Gemini" action button with loading spinner.
  * Split / Side-by-Side Review Editor: Original Raw Tasks on the left, Editable AI Draft on the right.
  * Action Toolbar: "Copy as Markdown", "Copy for Slack", "Save Report".
* **User Actions:** Generate draft, edit text directly, export to clipboard.
* **API Interactions:** `POST /api/reports/ai-generate`, `POST /api/reports`.

### Page 6: DTR Document Builder (`/documents`)
* **Purpose:** Generating official printable DTRs.
* **UI Components:** Month/Year Selector, Configuration Preview (Trainee name, company, target hours), In-browser PDF Preview iframe, "Download PDF" button, "Print" button.
* **User Actions:** Select period, preview DTR, download generated PDF file.
* **API Interactions:** `GET /api/attendance/history`, `GET /api/settings`. (PDF generation runs client-side via `jsPDF`).

### Page 7: Settings & OJT Setup (`/settings`)
* **Purpose:** Configuring workplace geofence and internship target hours.
* **UI Components:** Workplace Name input, "Get Current GPS Coordinates" button, Manual Lat/Lng inputs, Radius slider (50m to 500m), Target Hours input (e.g., 486), Schedule times, Cloud Sync button (for guest users).
* **User Actions:** Test GPS accuracy, set company location, adjust target hours, sync guest records.
* **API Interactions:** `GET /api/settings`, `PUT /api/settings`, `POST /api/sync/guest`.

### Page 8: Supervisor Verification Portal (`/supervisor`)
* **Purpose:** Dedicated view for supervisors/instructors.
* **UI Components:** Trainee Search & Roster Card list, Trainee Detail Modal with complete attendance table, Geofence Flag Indicators, "Verify Shift" action button, Supervisor Remarks input box.
* **User Actions:** Select trainee, review records, approve/verify shifts with optional remarks.
* **API Interactions:** `GET /api/supervisor/trainees`, `POST /api/supervisor/verify`.

---

## 9. Backend Structure

The backend will be structured as an idiomatic, clean ASP.NET Core .NET 10 project:

```text
OJTHub.Server/
├── Controllers/ (or Endpoints/)
│   ├── AuthEndpoints.cs            # /api/auth registration, login, profile
│   ├── AttendanceEndpoints.cs      # /api/attendance time-in, time-out, status
│   ├── ActivityEndpoints.cs        # /api/activities CRUD
│   ├── ReportEndpoints.cs          # /api/reports AI generation & storage
│   ├── SettingsEndpoints.cs        # /api/settings configuration
│   └── SupervisorEndpoints.cs      # /api/supervisor verification
├── Data/
│   ├── OJTHubDbContext.cs          # EF Core DbContext definition
│   └── Migrations/                 # EF Core code-first migrations
├── Models/
│   ├── User.cs                     # Trainee and Supervisor entity
│   ├── OjtSetting.cs               # Geofence & target hours entity
│   ├── AttendanceRecord.cs         # Attendance timestamp & coordinates entity
│   ├── ActivityLog.cs              # Task logging entity
│   └── GeneratedReport.cs          # AI report entity
├── DTOs/
│   ├── AuthDtos.cs                 # LoginRequest, RegisterRequest, UserResponse
│   ├── AttendanceDtos.cs           # TimeInRequest, TimeOutRequest, AttendanceResponse
│   ├── ActivityDtos.cs             # CreateActivityRequest, ActivityResponse
│   ├── ReportDtos.cs               # GenerateReportRequest, ReportResponse
│   └── SettingsDtos.cs             # UpdateSettingsRequest, SettingsResponse
├── Services/
│   ├── IAttendanceService.cs       # Geofence math, accuracy & state validation
│   ├── AttendanceService.cs
│   ├── IHoursCalculator.cs         # Net hours and schedule projection logic
│   ├── HoursCalculator.cs
│   ├── IGeminiService.cs           # Google Gemini API client integration
│   ├── GeminiService.cs
│   ├── ITokenService.cs            # JWT token generation and validation
│   └── TokenService.cs
├── Middleware/
│   └── GlobalExceptionHandler.cs   # Centralized RFC 7807 problem details handler
├── Configurations/
│   ├── JwtOptions.cs               # Secret keys, issuer, audience settings
│   └── GeminiOptions.cs            # Gemini model, API key, temperature settings
├── Program.cs                      # Service registration, middleware pipeline, endpoint mapping
└── OJTHub.Server.csproj            # .NET 10 project file
```

### Folder Responsibilities
* **`Endpoints/`**: Organizes endpoint route mapping using Minimal API route groups (`app.MapGroup("/api/...")`) with OpenAPI descriptions.
* **`Data/`**: Contains the EF Core `DbContext`, entity configuration mappings, and database migration scripts.
* **`Models/`**: Domain entities reflecting the PostgreSQL database schema.
* **`DTOs/`**: Data Transfer Objects preventing over-posting and strictly defining API contracts.
* **`Services/`**: Encapsulates business logic (Haversine geofencing calculations, net hours logic, Gemini prompt construction).
* **`Middleware/`**: Global error handling, request logging, and security headers.
* **`Configurations/`**: Strongly-typed options bound to `appsettings.json` and environment variables.

---

## 10. Security Implementation

### 10.1 Authentication & Authorization
* **JWT Bearer Authentication:** The server issues signed JSON Web Tokens upon login containing standard claims (`sub`, `email`, `role`).
* **Role Claims:** Endpoints verify user roles via standard policies:
  * Trainee-only actions: `RequireRole("Trainee")`.
  * Supervisor actions: `RequireRole("Supervisor")`.
* **Password Hashing:** Passwords are never stored in plaintext. They are hashed using ASP.NET Core `IPasswordHasher<User>` utilizing PBKDF2 with HMAC-SHA256 and unique per-user cryptographic salts.

### 10.2 Geofence & Tamper Resistance
* **Server-Side Distance Re-Verification:** The frontend sends raw latitude and longitude. The backend computes the Haversine distance independently and validates against `GeofenceRadiusMeters`. The server never trusts client-supplied booleans like `isInside = true`.
* **GPS Accuracy Gate:** The backend enforces `accuracy <= GpsAccuracyThreshold` (rejecting coordinates with accuracy > 50m).
* **Timestamp Integrity:** Shift start and end times are recorded using the server's UTC clock (`DateTimeOffset.UtcNow`), preventing trainees from spoofing their device's local system time.

### 10.3 Input Validation & SQL Injection Prevention
* **Entity Framework Core:** All database communication uses EF Core parameterized queries and LINQ expressions, completely preventing SQL injection.
* **FluentValidation / DataAnnotations:** Incoming DTOs validate required fields, string lengths, coordinate numerical boundaries, and date formats before execution.

### 10.4 XSS & Content Security
* **React Auto-Escaping:** React automatically escapes values rendered in JSX, neutralizing injected HTML/script tags.
* **Sanitized AI Output:** When AI-generated reports are rendered, markdown parsers run with HTML sanitization enabled.

### 10.5 AI Key Protection & Rate Limiting
* The Google Gemini API key is stored exclusively in backend environment variables (`GEMINI_API_KEY`) and is never delivered to the client.
* Basic per-user rate limiting (e.g., max 10 AI generation requests per day) prevents API quota exhaustion.

---

## 11. Development Phases

### Phase 1: Project Setup & Repository Initialization
* **Objectives:** Establish project repositories, directory structures, build tooling, and coding standards.
* **Tasks:**
  * Initialize repository with `.gitignore` for .NET, React, and Node.
  * Create ASP.NET Core .NET 10 project and React + Vite + Tailwind CSS frontend.
  * Configure `.agents/` plugins and skills discovered in the workspace.
  * Set up PostgreSQL database connection and initial EF Core infrastructure.
* **Deliverables:** Compiling frontend and backend solutions; clean `dotnet run` and `npm run dev` execution.
* **Dependencies:** None.
* **Definition of Done:** Both frontend and backend start up locally without errors; initial database connection verified.

### Phase 2: User Authentication & Profile Module
* **Objectives:** Implement user accounts, secure authentication, and role separation.
* **Tasks:**
  * Create `User` model and `OJTHubDbContext`.
  * Implement `AuthEndpoints` (`/register`, `/login`, `/me`).
  * Set up JWT token issuance and ASP.NET Core authorization middleware.
  * Build React Auth pages (Login, Register, Role selector).
* **Deliverables:** Working registration and login flows with JWT persistence in the client.
* **Dependencies:** Phase 1.
* **Definition of Done:** A trainee and supervisor can register, log in, receive valid tokens, and view their respective blank dashboards.

### Phase 3: OJT Configuration & Geofenced Attendance Engine
* **Objectives:** Build the core geolocation attendance system.
* **Tasks:**
  * Create `OjtSetting` and `AttendanceRecord` entities and migrations.
  * Implement Haversine distance formula and GPS accuracy validation in `AttendanceService`.
  * Implement `POST /api/attendance/time-in` and `POST /api/attendance/time-out`.
  * Implement React Geolocation custom hook (`useGeolocation`) and Dashboard Time-In/Time-Out UI with live distance feedback.
* **Deliverables:** Working Time-In and Time-Out mechanism with geofence and accuracy validation.
* **Dependencies:** Phase 2.
* **Definition of Done:** Trainee can record attendance only when within allowed workplace radius and with acceptable GPS accuracy; state machine prevents invalid sequences.

### Phase 4: Hours Engine, Calendar & Attendance History
* **Objectives:** Implement automated hour calculations and historical records.
* **Tasks:**
  * Implement `HoursCalculator` service computing daily net hours and remaining hours.
  * Build endpoints `GET /api/attendance/history` and `GET /api/hours/summary`.
  * Create React Calendar and table view for past shifts.
* **Deliverables:** Dashboard showing live progress percentage, total hours rendered, and detailed attendance logbook.
* **Dependencies:** Phase 3.
* **Definition of Done:** Time records accurately compute net hours (with lunch break deductions) and update overall OJT progress bars.

### Phase 5: Daily Activity Logging
* **Objectives:** Provide trainees with a structured task documentation logbook.
* **Tasks:**
  * Create `ActivityLog` entity and migrations.
  * Implement `ActivityEndpoints` (Create, Read, Update, Delete).
  * Build React Activity Log interface with task cards, category tags, and date filters.
* **Deliverables:** Fully functional CRUD activity logging module.
* **Dependencies:** Phase 2.
* **Definition of Done:** Trainee can record and edit daily accomplishments tied to dates.

### Phase 6: AI-Assisted Reporting (Google Gemini Integration)
* **Objectives:** Generate polished EOD reports and journal narratives using AI.
* **Tasks:**
  * Register `GeminiService` in ASP.NET Core using the Gemini API.
  * Construct structured prompts aggregating trainee activity entries.
  * Implement `POST /api/reports/ai-generate` and `POST /api/reports`.
  * Build React Review & Edit workspace with export options (Markdown, Slack/Discord, Email).
* **Deliverables:** AI-powered report generator with human editing and export capabilities.
* **Dependencies:** Phase 5.
* **Definition of Done:** Trainee selects a date or range and receives a drafted report from Gemini that can be edited and exported.

### Phase 7: Printable PDF DTR Generation
* **Objectives:** Generate official, print-ready DTR sheets.
* **Tasks:**
  * Integrate `jsPDF` and `jsPDF-AutoTable` in the React application.
  * Implement DTR layout matching standard institutional daily time records.
  * Wire attendance records, total hours, and trainee metadata into the PDF table.
  * Add supervisor and trainee signature lines.
* **Deliverables:** Client-side PDF generation producing clean, printable DTR documents.
* **Dependencies:** Phase 4.
* **Definition of Done:** Trainee can select any month and download a formatted PDF with correct dates, times, and hours.

### Phase 8: PWA Features & Guest Mode Storage
* **Objectives:** Enable mobile app installability and offline guest capability.
* **Tasks:**
  * Configure `vite-plugin-pwa`, web app manifest (icons, theme colors), and service worker.
  * Implement local storage / IndexedDB repository for guest trainees.
  * Implement `POST /api/sync/guest` to migrate guest records upon account creation.
* **Deliverables:** Installable PWA with working offline shell and guest synchronization.
* **Dependencies:** Phases 3, 5.
* **Definition of Done:** PWA prompts for installation on mobile/desktop; guest trainee can record logs offline and sync them to a cloud account later.

### Phase 9: Supervisor Verification Portal
* **Objectives:** Provide supervisors with trainee monitoring and verification tools.
* **Tasks:**
  * Build `SupervisorEndpoints` (`/api/supervisor/trainees`, `/api/supervisor/verify`).
  * Create Supervisor Dashboard in React showing assigned trainee cards and hours.
  * Implement detailed trainee inspection view with geofence compliance badges and one-click "Verify" button.
* **Deliverables:** Functional supervisor portal.
* **Dependencies:** Phases 4, 5.
* **Definition of Done:** Supervisor can review an assigned trainee's attendance and activity logs and mark them as verified.

### Phase 10: Testing, QA & Deployment
* **Objectives:** Verify complete system stability, test on real devices, and deploy to production.
* **Tasks:**
  * Execute unit and integration tests (geofence math, hours engine, auth).
  * Perform cross-device testing (Android Chrome, iOS Safari, Desktop).
  * Deploy backend and PostgreSQL to Render/Railway.
  * Deploy React PWA to Vercel.
  * Perform end-to-end verification in production environment.
* **Deliverables:** Live, deployed OJTHub application with production URL and documentation.
* **Dependencies:** Phases 1–9.
* **Definition of Done:** Production system fully functional with active database and HTTPS.

---

## 12. Development Timeline

Based on the 8-week work plan in the proposal, here is the realistic schedule:

| Phase / Week | Tasks | Estimated Duration | Dependencies | Key Deliverable |
| :--- | :--- | :---: | :--- | :--- |
| **Week 1** | Requirements refinement, DB schema design, solution setup | 1 Week | None | Initial repo, DB scaffolding, UI wireframes |
| **Week 2** | User auth, JWT token service, React Auth & Shell layout | 1 Week | Week 1 | Functional registration & login with role access |
| **Week 3** | Geofence attendance engine, GPS validation, Time-In/Out UI | 1 Week | Week 2 | Working geofenced punch clock with live GPS check |
| **Week 4** | Hours engine, attendance history table, calendar view | 1 Week | Week 3 | Cumulative hours engine and attendance logbook |
| **Week 5** | Activity logging module, Google Gemini AI integration | 1 Week | Week 4 | Daily task logs + AI EOD & journal report drafts |
| **Week 6** | PDF DTR generator (`jsPDF`), multi-format report exporter | 1 Week | Week 5 | Print-ready PDF DTR sheets and export formats |
| **Week 7** | PWA manifest, service worker, guest sync, supervisor portal | 1 Week | Week 6 | Installable PWA and supervisor verification UI |
| **Week 8** | Integration testing, real-device QA, cloud deployment | 1 Week | Week 7 | Live deployed application on Vercel & Render |

---

## 13. Testing Strategy

### 13.1 Unit Testing
* **Haversine Distance Calculator:** Test various GPS coordinate pairs (exact location, 50m away, 150m away, opposite hemisphere) to ensure distance calculations are accurate within centimeters.
* **Hours Calculation Engine:**
  * Normal 8-hour shift with 1-hour lunch break = 7.0 net hours.
  * Shift crossing noon with default lunch deduction.
  * Short shift (< 4 hours) where lunch break should not be deducted.
  * Cumulative hours sum and remaining hours calculation.
* **Attendance State Machine:**
  * Prevent Time-Out if no Time-In exists.
  * Prevent consecutive Time-In actions without an intervening Time-Out.

### 13.2 Integration Testing
* **Auth Pipeline:** Register user -> Attempt login with correct credentials -> Receive valid JWT -> Attempt request to protected endpoint -> Verify claims.
* **Attendance Endpoint:** Authenticated trainee posts GPS coordinates -> Database stores `AttendanceRecord` with correct user ID, distance, and geofence flag.
* **Gemini API Integration:** Mock external Gemini response in test harness to verify error handling when API quota or timeout occurs.

### 13.3 System & Cross-Device Testing
* Test PWA installation on Android (Chrome "Add to Home Screen") and iOS (Safari "Add to Home Screen").
* Test permission handling when user denies location access (clear error prompt with instructions to enable GPS).
* Test weak GPS signal handling (mock accuracy = 80m -> verify system instructs user to get better reception).

### 13.4 Test Cases Matrix

| Test ID | Feature | Scenario | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Auth | Register with existing email | 400 Conflict with clear error message | High |
| **TC-02** | Geofence | Time-In with coordinates within 40m of workplace (radius = 100m) | Attendance recorded; `withinGeofence = true` | Critical |
| **TC-03** | Geofence | Time-In with coordinates 180m away from workplace (radius = 100m) | Attendance recorded with warning flag, or blocked based on strict policy | Critical |
| **TC-04** | GPS Accuracy | Time-In with GPS accuracy reported as 95 meters (> 50m threshold) | Action rejected: "GPS signal too weak. Please move outdoors." | High |
| **TC-05** | State Guard | Time-Out requested when no open Time-In exists | Action rejected: "No active Time-In record found." | Critical |
| **TC-06** | Hours Engine | Time-In at 8:00 AM, Time-Out at 5:00 PM (1h lunch) | Net hours calculated as exactly 8.00 hours | Critical |
| **TC-07** | AI Reports | Generate EOD report with 3 activity logs | Returns structured markdown containing all 3 activities summarized | High |
| **TC-08** | PDF DTR | Generate DTR for month with 20 attendance shifts | PDF generates cleanly with 20 table rows, correct sum, and signature lines | High |
| **TC-09** | Supervisor | Supervisor clicks "Verify Record" on trainee shift | Shift status updates to `isVerified = true` with supervisor audit stamp | High |
| **TC-10** | Guest Sync | Guest creates 2 shifts offline, then registers | System uploads the 2 shifts to the new cloud account seamlessly | Medium |

---

## 14. Deployment Plan

### 14.1 Production Architecture
* **Frontend PWA:** Hosted on **Vercel** (Global Edge CDN, automatic HTTPS, free tier).
* **Backend API:** Hosted on **Render** or **Railway** as a containerized or native .NET Web Service (automatic HTTPS, free/starter tier).
* **Database:** Managed **PostgreSQL** instance on Render or Railway (or Supabase free tier).

### 14.2 Environment Configuration
* **Backend Environment Variables:**
  * `ASPNETCORE_ENVIRONMENT=Production`
  * `ConnectionStrings__DefaultConnection=Host=...;Database=ojthub;Username=...;Password=...;SSL Mode=Require;`
  * `JwtOptions__SecretKey=<64-character-random-key>`
  * `JwtOptions__Issuer=https://api.ojthub.com`
  * `JwtOptions__Audience=https://ojthub.com`
  * `GeminiOptions__ApiKey=<google-gemini-api-key>`
  * `AllowedOrigins=https://ojthub.vercel.app`
* **Frontend Environment Variables (`.env.production`):**
  * `VITE_API_BASE_URL=https://ojthub-api.onrender.com/api`

### 14.3 Database Migrations & Maintenance
* Run EF Core migrations during deployment startup or via CI pipeline: `dotnet ef database update`.
* Database backups: Automated daily snapshots provided by the managed PostgreSQL provider (e.g., Render/Railway automated backup).

---

## 15. Git and Development Workflow

### 15.1 Branching Strategy
* **`main`:** Production-ready code only. Automatically triggers deployment to Vercel and Render.
* **`develop`:** Primary working branch where integrated features are validated.
* **`feature/<name>`:** Short-lived branches for individual modules (e.g., `feature/geofence-attendance`, `feature/gemini-reports`, `feature/pdf-dtr`).

### 15.2 Commit Naming Conventions
Follow Conventional Commits:
* `feat: add Haversine geofence calculation service`
* `fix: correct lunch deduction logic for half-day shifts`
* `style: enhance mobile punch-clock button styling`
* `docs: update API endpoints documentation in docs/`
* `test: add unit tests for hours calculation engine`

---

## 16. Risk Management

| Risk | Probability | Impact | Mitigation |
| :--- | :---: | :---: | :--- |
| **GPS Accuracy Fluctuations Indoors** | High | High | Implement a reasonable accuracy threshold (50m) and prompt users to step near a window or outdoors if signal is weak. Allow trainee to log with an "Outside Perimeter" flag that flags for supervisor review rather than hard-blocking, ensuring trainees aren't penalized for spotty GPS. |
| **Device Time Spoofing** | Medium | High | Rely strictly on server-side UTC timestamps (`DateTimeOffset.UtcNow`) recorded upon API receipt; do not accept client-provided clock times. |
| **Google Gemini API Rate Limits / Timeouts** | Medium | Medium | Implement timeout fallbacks (8-second threshold) and display a clear error message allowing retry. Cache recent prompt results. |
| **User Denies Browser Location Permission** | High | High | Build an engaging on-screen tutorial explaining *why* location is required and how to re-enable permissions in browser site settings. |
| **Database Free-Tier Inactivity Sleep (Render)** | Medium | Low | Use keep-alive pings during demonstration or recommend Railway/Supabase for persistent uptime. |
| **Browser Storage Eviction in Guest Mode** | Low | Medium | Display clear warning banners encouraging guest users to create a free account to back up their records to the cloud. |

---

## 17. Technical Decisions

| Decision Area | Recommended Choice | Rationale |
| :--- | :--- | :--- |
| **Architecture** | Decoupled Minimal API + React SPA PWA | Native mobile PWA feel, fast UI updates, secure backend API key boundary, and simple independent deployments. |
| **Backend Framework** | ASP.NET Core .NET 10 LTS | High performance, modern Minimal APIs, first-class C# tooling, built-in dependency injection, and native OpenAPI generation. |
| **Database** | PostgreSQL | Robust open-source relational database with strong decimal precision, widely supported across free hosting providers. |
| **ORM** | Entity Framework Core 10 | Type-safe LINQ queries, automated code-first migrations, and seamless PostgreSQL support via `Npgsql.EntityFrameworkCore.PostgreSQL`. |
| **Frontend Framework** | React.js + Vite | Ultra-fast development server, massive ecosystem, easy state management, and simple PWA integration via `vite-plugin-pwa`. |
| **CSS Framework** | Tailwind CSS | Rapid, utility-first styling with design tokens; produces minimal production CSS bundles; ideal for responsive mobile layouts. |
| **PWA Engine** | `vite-plugin-pwa` + Workbox | Zero-config service worker generation, offline caching strategies, and built-in web app manifest support. |
| **AI Integration** | Google Gemini API (via server proxy) | High-speed response, cost-effective free quota, excellent narrative summarization capabilities. |
| **PDF Generation** | `jsPDF` + `jsPDF-AutoTable` | 100% client-side execution; generates crisp vector PDFs without server rendering overhead or headless browser dependencies. |
| **Testing Harness** | MSTest + xUnit / Vitest | Standard .NET test runner supported by installed `.agents/` plugins; Vitest for fast React component and hook testing. |

---

## 18. MVP Definition

### 18.1 MVP — Required (Minimum Viable Product)
These features are strictly mandatory for the system to fulfill the project proposal:
1. **User Authentication:** Trainee and Supervisor registration and login with role separation.
2. **OJT Configuration:** Trainee workplace coordinates (Lat/Lng), geofence radius, and target hours.
3. **Geofenced Attendance:** One-tap Time-In and Time-Out using device geolocation with distance checking and GPS accuracy validation.
4. **Hours Engine:** Automated calculation of daily net hours, cumulative hours rendered, and remaining hours.
5. **Daily Activity Logging:** Form to record daily tasks, accomplishments, and date.
6. **AI Reporting (Gemini):** Backend connection to Gemini to draft daily EOD summaries from activity logs.
7. **PDF DTR Generation:** Client-side generation of printable Daily Time Record sheets.
8. **Supervisor Verification:** Basic supervisor portal to view trainee records and mark shifts as verified.

### 18.2 Post-MVP — Optional (Enhancements if time permits)
* Extended Date-Range Narrative Journal Generator (weekly/monthly multi-page narratives).
* Multi-format export helpers (formatted Markdown / Slack / Discord clipboard copy).
* Guest mode browser storage with cloud sync on registration.
* Dark / Light mode theme switcher.
* Interactive Leaflet/OpenStreetMap visual map showing the workplace perimeter circle and user location pin.

---

## 19. Implementation Backlog

| ID | Task | Module | Priority | Dependency | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **T-01** | Create solution, initialize Git repo, and organize project folders | Infrastructure | **P0** | None | Ready |
| **T-02** | Configure EF Core 10, PostgreSQL connection, and base entity models | Database | **P0** | T-01 | Ready |
| **T-03** | Implement User authentication (JWT, Password Hashing, Login/Register endpoints) | User Management | **P0** | T-02 | Ready |
| **T-04** | Scaffold React + Vite + Tailwind CSS frontend with routing and Auth state | Frontend Shell | **P0** | T-01 | Ready |
| **T-05** | Build Login & Registration pages in React | Frontend Auth | **P0** | T-03, T-04 | Ready |
| **T-06** | Implement `OjtSetting` entity, endpoints, and Settings configuration UI | OJT Config | **P0** | T-02, T-05 | Ready |
| **T-07** | Implement `AttendanceService` (Haversine formula, accuracy checks, state guard) | Backend Attendance | **P0** | T-06 | Ready |
| **T-08** | Implement `useGeolocation` React hook and Time-In / Time-Out Punch Clock UI | Frontend Attendance | **P0** | T-07 | Ready |
| **T-09** | Implement `HoursCalculator` service (net hours, cumulative totals) | Hours Engine | **P0** | T-07 | Ready |
| **T-10** | Build Attendance History table and monthly filter in React | Frontend Attendance | **P0** | T-08, T-09 | Ready |
| **T-11** | Implement `ActivityLog` entity, endpoints, and CRUD UI | Activity Log | **P0** | T-03, T-04 | Ready |
| **T-12** | Implement backend `GeminiService` integration and AI prompt pipeline | AI Reporting | **P0** | T-11 | Ready |
| **T-13** | Build AI Report generation and human review/editing workspace | AI Reporting | **P0** | T-12 | Ready |
| **T-14** | Implement PDF DTR generation using `jsPDF` and `jsPDF-AutoTable` | Documents / DTR | **P0** | T-10 | Ready |
| **T-15** | Implement Supervisor Verification endpoints and dashboard UI | Supervisor Portal | **P0** | T-10, T-11 | Ready |
| **T-16** | Configure `vite-plugin-pwa`, web app manifest, and service worker | PWA | **P1** | T-04 | Planned |
| **T-17** | Implement IndexedDB guest storage and cloud synchronization endpoint | Data Sync | **P1** | T-08, T-11 | Planned |
| **T-18** | Implement multi-format report copy utility (Markdown, Slack, Email) | AI Reporting | **P1** | T-13 | Planned |
| **T-19** | Implement Leaflet / OpenStreetMap visual geofence circle preview | OJT Config | **P2** | T-06 | Planned |
| **T-20** | Execute end-to-end integration tests, mobile QA, and production deployment | Deployment | **P0** | T-14, T-15 | Planned |

---

## 20. Recommended Development Order

To guarantee steady progress and testable milestones, build the system in this exact sequential order:

1. **Solution & Data Foundation:** Create the ASP.NET Core project and React Vite project. Configure PostgreSQL and apply the initial EF Core migration for `User` and `OjtSetting`.
2. **Authentication Core:** Implement JWT token issuance, password hashing, and user registration/login endpoints. Wire up client-side auth context and login forms.
3. **Workplace Configuration Seam:** Create the Settings page allowing trainees to set workplace GPS coordinates, radius, and target hours.
4. **Geofenced Attendance Engine:** Code the Haversine distance calculator on the backend. Connect the browser's `navigator.geolocation` API to the Punch Clock UI. Verify that Time-In succeeds inside the perimeter and warns/blocks outside.
5. **Hours Engine & History View:** Wire up net hours calculation (with lunch deduction) and render the progress summary cards and historical attendance log table.
6. **Activity Log Module:** Build the daily task logger so trainees can log what they did each day.
7. **Gemini AI Integration:** Set up the backend Gemini API service with structured prompts. Build the report generation UI where students can generate and edit daily EOD reports.
8. **PDF DTR Generation:** Implement `jsPDF` client-side formatting so students can instantly preview and print their official DTR sheets.
9. **Supervisor Verification Portal:** Build the supervisor dashboard allowing instructors to inspect trainee logs and click "Verify".
10. **PWA & Offline Packaging:** Add `vite-plugin-pwa`, service worker caching, app manifest icons, and guest IndexedDB storage.
11. **Security & Polish:** Verify input sanitization, test edge cases (denied GPS permissions, offline reconnection), and perform mobile usability checks.
12. **Cloud Deployment:** Deploy the backend to Render/Railway, database to PostgreSQL, and frontend to Vercel.

---

# FINAL IMPLEMENTATION SUMMARY

1. **Recommended Architecture:** A decoupled **ASP.NET Core .NET 10 Minimal API** backend paired with a **React.js + Vite + Tailwind CSS Progressive Web Application (PWA)** frontend. This ensures native mobile performance, offline caching, and strict server-side protection of the Gemini API key and geofence calculations.
2. **Main Modules:**
   * User Management & Authentication (JWT keycards & role permissions)
   * OJT Configuration (Workplace GPS perimeter & target hour goals)
   * Geofenced Attendance (One-tap punch clock, GPS accuracy & distance checks)
   * Hours Engine & Tracker (Automatic net hours, progress bar, completion forecast)
   * Daily Activity Logbook (Task and accomplishment journaling)
   * AI-Assisted Reporting (Google Gemini daily EOD summaries & journal drafts)
   * PDF DTR Generator (`jsPDF` printable institutional time records)
   * Supervisor Verification Portal (Supervisor roster review & sign-off)
   * PWA & Guest Mode (Installable mobile experience & offline browser storage)
3. **Core Database Entities:**
   * `User`: Trainees and Supervisors.
   * `OjtSetting`: Workplace latitude/longitude, geofence radius, target hours, and schedule.
   * `AttendanceRecord`: Shift dates, Time-In/Time-Out timestamps, GPS coordinates, distance, net hours, and verification status.
   * `ActivityLog`: Daily tasks, accomplishments, hours spent, and category tags.
   * `GeneratedReport`: AI-generated drafts, prompt context, and human-edited final versions.
4. **MVP Scope:**
   * Core registration/login for Trainee and Supervisor.
   * Geofenced Time-In and Time-Out with distance calculation and GPS accuracy gate.
   * Automated net hours and progress tracking.
   * Daily task activity logging.
   * Gemini-powered EOD report generation.
   * Printable PDF DTR generation.
   * Supervisor verification dashboard.
5. **Development Phases:** 10 structured phases spanning 8 weeks, progressing from Project Foundation & Auth (Weeks 1–2), to Core Geofenced Attendance & Hours (Weeks 3–4), Activity & AI Reporting (Week 5), PDF DTR & Supervisor Portal (Weeks 6–7), and culminating in Testing & Cloud Deployment (Week 8).
6. **Main Technical Risks:**
   * *Indoor GPS degradation:* Mitigated by setting an accuracy gate (50m), clear user guidance, and logging with warning flags rather than blocking.
   * *Device clock spoofing:* Completely neutralized by using server-side UTC timestamps exclusively.
   * *AI API limits:* Handled via server-side rate limits and defensive error fallbacks.
7. **Recommended Development Order:**
   1. Solution Setup & Database Foundation
   2. Authentication & User Roles
   3. OJT Settings & Geofence Setup
   4. Attendance Engine (Haversine & GPS validation)
   5. Hours Engine & Attendance History Table
   6. Activity Logging Module
   7. AI Reporting with Gemini API
   8. PDF DTR Generation (`jsPDF`)
   9. Supervisor Verification Portal
   10. PWA Packaging & Offline Sync
   11. Quality Assurance & Cloud Deployment
8. **Definition of a Completed OJTHub System:** A fully functional, responsive Progressive Web Application where an OJT trainee can reliably punch Time-In and Time-Out verified against their workplace geofence, track their rendered and remaining hours in real-time, document daily tasks, generate polished AI reports via Google Gemini, export print-ready PDF DTRs, and have their attendance officially verified by their supervisor.
