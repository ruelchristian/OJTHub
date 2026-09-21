# ---------------------------------------------------------
# Stage 1: Build Frontend (React + Vite PWA)
# ---------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /app/client

# Copy package manifests and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy client source code and build production bundle
COPY client/ ./
RUN npm run build

# ---------------------------------------------------------
# Stage 2: Build Backend (.NET 10 Web API)
# ---------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-builder
WORKDIR /src

# Copy csproj and restore dependencies
COPY server/OJTHub.Server/OJTHub.Server.csproj ./server/OJTHub.Server/
RUN dotnet restore server/OJTHub.Server/OJTHub.Server.csproj

# Copy server source code and publish
COPY server/OJTHub.Server/ ./server/OJTHub.Server/
WORKDIR /src/server/OJTHub.Server
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# ---------------------------------------------------------
# Stage 3: Final Unified Runtime
# ---------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Copy published .NET backend
COPY --from=backend-builder /app/publish .

# Copy compiled React PWA into ASP.NET Core's wwwroot folder
COPY --from=frontend-builder /app/client/dist ./wwwroot

# Default port for Render (Render automatically injects PORT)
ENV PORT=10000
ENV ASPNETCORE_URLS=http://0.0.0.0:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "OJTHub.Server.dll"]
