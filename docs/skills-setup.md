# OJTHub Installed Skills & Plugins Configuration

This document outlines the agent skills and plugins installed in [`.agents/`](file:///E:/OJTHub/.agents) to support the development of **OJTHub: Geofenced OJT Attendance, AI-Assisted Reporting, and Customizable OJT Management PWA** according to [Proposal-4_OJTHub.docx](file:///E:/OJTHub/Proposal-4_OJTHub.docx).

---

## 1. Backend: .NET Plugins (from [dotnet/skills](https://github.com/dotnet/skills))

The backend is built with **ASP.NET Core .NET 10 LTS Minimal API** and **PostgreSQL + Entity Framework Core**.

### Installed Plugins & Skills:
- **`dotnet-aspnetcore`** ([plugin.json](file:///E:/OJTHub/.agents/plugins/dotnet-aspnetcore/plugin.json)):
  - [`dotnet-webapi`](file:///E:/OJTHub/.agents/skills/dotnet-webapi/SKILL.md): Implements RESTful HTTP semantics, endpoint routing, status codes, and OpenAPI/Swagger documentation for trainee attendance, activity logs, and authentication.
  - [`minimal-api-file-upload`](file:///E:/OJTHub/.agents/skills/minimal-api-file-upload/SKILL.md): Manages file uploads (such as trainee proof attachments, signatures, or supporting documentation).
  - [`configuring-opentelemetry-dotnet`](file:///E:/OJTHub/.agents/skills/configuring-opentelemetry-dotnet/SKILL.md): Sets up observability, logging, and metrics for attendance and AI operations.
- **`dotnet-data`** ([plugin.json](file:///E:/OJTHub/.agents/plugins/dotnet-data/plugin.json)):
  - [`create-datadriven-aspnetcore`](file:///E:/OJTHub/.agents/skills/create-datadriven-aspnetcore/SKILL.md): Scaffolds and structures Entity Framework Core DbContext, PostgreSQL models, migrations, and repository/service patterns.
  - [`optimizing-ef-core-queries`](file:///E:/OJTHub/.agents/skills/optimizing-ef-core-queries/SKILL.md): Optimizes EF Core queries, prevents N+1 query traps, and ensures high-performance data operations for attendance records and hours calculations.
- **`dotnet-test`** ([plugin.json](file:///E:/OJTHub/.agents/plugins/dotnet-test/plugin.json)):
  - [`scaffold-dotnet-test-project`](file:///E:/OJTHub/.agents/skills/scaffold-dotnet-test-project/SKILL.md), [`writing-mstest-tests`](file:///E:/OJTHub/.agents/skills/writing-mstest-tests/SKILL.md), [`run-tests`](file:///E:/OJTHub/.agents/skills/run-tests/SKILL.md): Provides automated testing harnesses for business rules (geofence calculations, attendance sequence validation, net hours calculation).

---

## 2. Frontend & PWA: Awesome Skills

The frontend is an installable **Progressive Web Application (PWA)** built with **React.js, Vite, and Tailwind CSS**.

### Installed Skills:
- [`progressive-web-app`](file:///E:/OJTHub/.agents/skills/progressive-web-app/SKILL.md): Configures `vite-plugin-pwa`, service worker caching strategies, web app manifest, and offline support for guest users.
- [`react-best-practices`](file:///E:/OJTHub/.agents/skills/react-best-practices/SKILL.md): Implements clean rendering performance, component lifecycle hygiene, and responsive UI updates.
- [`react-patterns`](file:///E:/OJTHub/.agents/skills/react-patterns/SKILL.md): Structured component architecture, custom hooks (e.g., Geolocation hook, Timer hook), and modular code organization.
- [`react-ui-patterns`](file:///E:/OJTHub/.agents/skills/react-ui-patterns/SKILL.md): Handles loading states, skeleton placeholders, and error boundaries for async data flows.
- [`tailwind-design-system`](file:///E:/OJTHub/.agents/skills/tailwind-design-system/SKILL.md) & [`tailwind-patterns`](file:///E:/OJTHub/.agents/skills/tailwind-patterns/SKILL.md): Provides a clean design token system, responsive layouts for both mobile and desktop screens, and component styling.
- [`frontend-api-integration-patterns`](file:///E:/OJTHub/.agents/skills/frontend-api-integration-patterns/SKILL.md): Manages API communication between the React client and ASP.NET Core backend, handling request cancellation, retries, and clean error notifications.
- [`ui-ux-pro-max`](file:///E:/OJTHub/.agents/skills/ui-ux-pro-max/SKILL.md): Delivers high-quality UI layout, color harmonies, and accessible forms and cards for attendance tracking and report dashboards.
