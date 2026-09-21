# OJTHub Free Cloud Deployment Guide (Render)

This guide documents the deployment configuration, architecture, and instructions for running **OJTHub** 100% free on **Render**.

---

## 1. Architecture Overview: All-in-One Service

Rather than running the frontend and backend as two separate services on different domains, OJTHub uses a unified **Single Container Architecture**:

```
Render Cloud (Free Web Service)
┌────────────────────────────────────────────────────────┐
│  https://ojthub.onrender.com                           │
│                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────┐ │
│  │   React PWA Frontend    │  │  ASP.NET Core Web API│ │
│  │   (Static Files)        │  │  (/api/... Endpoints)│ │
│  └────────────┬────────────┘  └──────────┬───────────┘ │
└───────────────┼──────────────────────────┼─────────────┘
                │                          │
                └────────► Same Origin ◄───┘
                               │
                               ▼
                   PostgreSQL Database (ojthub-db)
```

### Key Advantages for Free Hosting
1. **Zero Cross-Origin (CORS) Issues**: Because the browser accesses the web app and the `/api/` endpoints from the same URL, cross-origin security errors are completely eliminated.
2. **Resource Efficiency**: Consumes only 1 Render free service allocation instead of 2.
3. **Single Management Point**: One unified repository push builds and updates both the UI and the backend synchronously.

---

## 2. Infrastructure as Code: `render.yaml`

The project includes [`render.yaml`](file:///E:/OJTHub/render.yaml) which defines:

1. **`ojthub-db` (Database)**:
   - Free tier PostgreSQL database located in the Singapore region (`singapore`).
   - Automatically provisions the `ojthub` database.
2. **`ojthub` (Web Service)**:
   - Built via the multi-stage [`Dockerfile`](file:///E:/OJTHub/Dockerfile).
   - Automatically receives the database connection string via `DATABASE_URL`.
   - Binds to Render's dynamic port (`PORT=10000`).
   - Built-in health check route at `/api/health`.

---

## 3. Container Pipeline ([`Dockerfile`](file:///E:/OJTHub/Dockerfile))

The multi-stage build performs 3 steps:
1. **Frontend Stage (`node:22-alpine`)**: Restores npm dependencies, executes `npm run build`, and compiles the production bundle to `client/dist`.
2. **Backend Stage (`mcr.microsoft.com/dotnet/sdk:10.0-preview`)**: Restores NuGet dependencies and publishes the ASP.NET Core project in Release mode.
3. **Runtime Stage (`mcr.microsoft.com/dotnet/aspnet:10.0-preview`)**: Combines the published .NET server and places the React PWA assets directly into `wwwroot`.

---

## 4. Live Deployment Status

- **Web Application**: [https://ojthub.onrender.com](https://ojthub.onrender.com)
- **Health Check Endpoint**: [https://ojthub.onrender.com/api/health](https://ojthub.onrender.com/api/health)
- **Render Service ID**: `srv-dao897h42hec738rdqq0` (Region: Singapore)
- **Render Database ID**: `dpg-dao89lo473hc739b2s4g-a` (`ojthub-db`, PostgreSQL 16)
- **GitHub Repository**: [https://github.com/ruelchristian/OJTHub](https://github.com/ruelchristian/OJTHub)
- **Render Dashboard**: [https://dashboard.render.com/web/srv-dao897h42hec738rdqq0](https://dashboard.render.com/web/srv-dao897h42hec738rdqq0)

### Verified Operations:
- Frontend SPA delivery with client routing (`/`, `/login`, `/dashboard`, `/supervisor`).
- Backend Web API endpoints under `/api/*`.
- PostgreSQL database read/write, user registration, JWT token generation, and automatic EF Core table creation.
