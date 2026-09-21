# Supervisor Governance, Trainee Settings Control & Documentation Access

**Document Status:** Architecture & Feature Proposal  
**Target Platform:** OJTHub PWA & Backend API (.NET 10 + React 19)  
**Related Source Files:**
- [`server/OJTHub.Server/Endpoints/SupervisorEndpoints.cs`](file:///E:/OJTHub/server/OJTHub.Server/Endpoints/SupervisorEndpoints.cs)
- [`server/OJTHub.Server/Endpoints/SettingsEndpoints.cs`](file:///E:/OJTHub/server/OJTHub.Server/Endpoints/SettingsEndpoints.cs)
- [`client/src/components/SupervisorPortal.tsx`](file:///E:/OJTHub/client/src/components/SupervisorPortal.tsx)
- [`client/src/components/SettingsView.tsx`](file:///E:/OJTHub/client/src/components/SettingsView.tsx)
- [`server/OJTHub.Server/Models/User.cs`](file:///E:/OJTHub/server/OJTHub.Server/Models/User.cs)

---

## 1. Executive Summary & Plain Analogy

In real-world internship programs, trainees should not be allowed to define their own workplace boundary or reduce their required hours. Think of the supervisor as the **Branch Manager Holding the Master Keys**:
- **The Digital Rulebook (Supervisor-Locked Settings):** When a student is assigned to a supervisor, only the supervisor can set the company's GPS pin on the map, adjust the geofence perimeter, and declare the total hours required (e.g., 486 hours). The student's settings page becomes a read-only badge showing: *"Managed by Supervisor [Name] — Location and hours are locked."*
- **The Trainee Work Dossier (Documentation Viewer):** Supervisors must not only see *when* trainees punched in and out, but also *what* they actually accomplished. The supervisor gets direct access to inspect the trainee's daily task logs, AI-synthesized standup reports, and weekly journals.

---

## 2. Core Enhancements

### A. Supervisor-Controlled Trainee Settings & Anti-Tamper Lock
1. **Trainee View Restriction:**
   - If a trainee is linked to a supervisor (`SupervisorId != null`), all fields in `SettingsView.tsx` (Workplace coordinates, geofence radius, target hours, daily schedule) become **Read-Only**.
   - Trainees can see their assigned workplace on the map and their hourly target, but cannot relocate the pin or alter requirements.
   - If a trainee does not have a supervisor (independent/unassigned or offline guest mode), they retain self-configuration rights.
2. **Supervisor Configuration Interface:**
   - In [`SupervisorPortal.tsx`](file:///E:/OJTHub/client/src/components/SupervisorPortal.tsx), each trainee card has a **"Configure OJT"** button.
   - Opening this allows the supervisor to:
     - Set or search the trainee's assigned work office location on the interactive map picker.
     - Adjust the geofence radius (e.g. 50m, 100m, 200m).
     - Set target required hours (e.g. 300, 486, 600 hours) and daily shift targets (e.g. 8.0 hrs/day).
     - Set default lunch break deductions.
     - Option to **"Apply to All My Trainees"** so supervisors don't have to re-enter coordinates for a batch of students interning at the same company.

### B. Trainee Documentation & AI Report Access for Supervisors
1. **Daily Activity Logs Tab:**
   - Supervisor can see the list of specific tasks logged by the student for any selected date range, including task category tags (e.g., Development, Documentation, Testing, Meeting) and hours spent.
2. **AI Reports & Narrative Journals Viewer:**
   - Trainees generate AI standup summaries and weekly reflection journals. Supervisors can view the full submitted drafts and finalized reports.
3. **One-Click DTR Inspection & Print Preview:**
   - Supervisors can preview and download the trainee's official vector PDF Daily Time Record (DTR) directly with all verified timestamps and net hour tallies.

### C. Recommended High-Value Supervisor Features

| Feature | Why It Matters in Real OJT | Proposed Implementation |
| :--- | :--- | :--- |
| **1. Supervisor Invitation Code / Company Key** | Avoids trainees manually searching through databases. Trainee simply types the supervisor's 6-character code (e.g., `OJT-842B`) during registration or in their profile to immediately link. | Auto-generated code on the Supervisor's profile; entering it links `trainee.SupervisorId = supervisor.Id`. |
| **2. Fieldwork & Remote Work Exception Stamp** | Trainees often attend client meetings, errands, or seminars outside the geofence. Currently, off-site punches are marked unverified. | Trainee requests an "Off-site / Fieldwork Exception" with a reason; supervisor can approve it with an official verification stamp. |
| **3. One-Click Batch Verification** | Reviewing 30 days of attendance one by one for 10 students (300 clicks) causes supervisor fatigue. | "Verify All Compliant Shifts" button that bulk-approves all shifts within the geofence in one click. |
| **4. Supervisor Feedback & Notes on Reports** | Coordinators and managers must give feedback on weekly progress reports. | Supervisor can add comments/evaluations directly to the trainee's weekly report or daily task log. |
| **5. Formal OJT Completion Clearance** | When total rendered hours reach 100%, the supervisor issues a final signed digital clearance. | Certificate / Clearance stamp indicating completion of academic internship requirements. |

---

## 3. Proposed Architecture & API Changes

### Database Updates ([`server/OJTHub.Server/Models/User.cs`](file:///E:/OJTHub/server/OJTHub.Server/Models/User.cs))
- Add `SupervisorCode` (`string`, e.g., `ABCD-1234`) to the `User` model for supervisors.
- Maintain `SupervisorId` on Trainee users to enforce ownership boundaries.

### New & Updated Backend Endpoints

```
GET  /api/supervisor/trainees/{id}/settings        -> Get trainee's current OJT settings
PUT  /api/supervisor/trainees/{id}/settings        -> Update trainee's OJT settings (supervisor only)
POST /api/supervisor/settings/broadcast           -> Apply current workplace settings to all assigned trainees
GET  /api/supervisor/trainees/{id}/activities      -> Get trainee's logged tasks & hours
GET  /api/supervisor/trainees/{id}/reports         -> Get trainee's AI standup & journal submissions
POST /api/supervisor/trainees/link-code            -> Trainee links to a supervisor using invite code
POST /api/supervisor/verify-batch                  -> Bulk verify multiple attendance records
```

### Frontend UI Updates
- **[`SettingsView.tsx`](file:///E:/OJTHub/client/src/components/SettingsView.tsx):** Display a banner when locked: *"Configuration locked by your supervisor: [Name]. Contact your supervisor to adjust your workplace location or required hours."* Inputs become disabled.
- **[`SupervisorPortal.tsx`](file:///E:/OJTHub/client/src/components/SupervisorPortal.tsx):** Expand the Trainee Inspection modal to include 3 dedicated tabs:
  - **Attendance & Verification:** Timesheet, GPS map distance verification, and 1-click approvals.
  - **Documentation & AI Reports:** Daily activity logs and AI-generated standup/weekly journals.
  - **OJT Parameters:** Interactive Map Picker, geofence radius, and target hours configured by the supervisor.
