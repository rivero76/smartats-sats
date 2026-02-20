# SmartATS Docker Setup Guide

## Overview
This guide explains how to run SmartATS in Docker containers for isolated development and production environments.

## Prerequisites
- Docker Desktop v4.61.0+ installed and running
- Logged into Docker account
- Project `.env.local` file configured with Supabase credentials

## Docker Configuration Files
- **Dockerfile** — Production-ready multi-stage build
- **Dockerfile.dev** — Development image with hot reload
- **docker-compose.yml** — Orchestrates services
- **.dockerignore** — Excludes unnecessary files (smaller images)

---

## 1. Development Mode (Recommended for Testing)

### Build and Run Development Container
```bash
docker-compose --profile dev up smartats-dev --build
```

**What happens:**
- Builds development image with hot-reload support
- Mounts source code as volume (live code changes reflect instantly)
- Runs Vite dev server on `http://localhost:8080`
- Port 8080 accessible from your Mac browser

**Access the app:**
```
http://localhost:8080
```

**Stop the container:**
```bash
docker-compose --profile dev down
```

**View logs:**
```bash
docker-compose logs -f smartats-dev
```

---

## 2. Production Mode

### Build and Run Production Container
```bash
docker-compose up smartats-app --build
```

**What happens:**
- Builds optimized production image (multi-stage, smaller size)
- Creates dist build of the React app
- Serves on port 3000 using `serve`
- Includes health checks

**Access the app:**
```
http://localhost:3000
```

**Stop the container:**
```bash
docker-compose down
```

**View logs:**
```bash
docker compose logs -f smartats-app
```

---

## 3. Useful Docker Commands

### View running containers
```bash
docker ps
```

### View all images
```bash
docker images
```

### Rebuild without cache
```bash
docker-compose up --build --no-cache
```

### Execute command in running container
```bash
docker-compose exec smartats-dev npm run lint
```

### Remove images and containers
```bash
docker-compose down -v
docker system prune
```

### View container stats (memory, CPU)
```bash
docker stats
```

---

## 4. Environment Variables

All Supabase credentials are already configured in `docker-compose.yml`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_LOGGING_ENABLED`

To change credentials, edit `docker-compose.yml` services section.

---

## 5. Volume Mounts Explained

**Development (`smartats-dev`):**
- `.:/app` — Your local code synced into container
- `/app/node_modules` — Named volume for dependencies
- **Result:** Code changes auto-reload instantly

**Production (`smartats-app`):**
- No volume mounts
- Everything copied at build time
- Immutable, production-ready

---

## 6. Multi-Stage Build Optimization

The production Dockerfile uses two stages:

1. **Builder Stage** — Compiles React app
2. **Production Stage** — Serves only the compiled dist folder
   - Smaller final image size (~200MB vs 1GB+)
   - No source code or dev dependencies in production
   - Faster startup

---

## 7. Health Checks

Both services include health checks:
- Dev: Checks if port 5173 is accessible
- Prod: Checks if port 3000 responds with 200 status
- Automatically restarts unhealthy containers

View health status:
```bash
docker ps  # Shows "healthy" or "unhealthy" in STATUS column
```

---

## 8. Troubleshooting

### Port already in use
**Dev (8080):**
```bash
docker-compose --profile dev up smartats-dev -p smartats-dev
```

**Prod (3000):**
```bash
docker-compose up smartats-app -p smartats-prod
```

### Container won't start
```bash
docker-compose logs smartats-dev    # View error logs
docker-compose--profile dev build --no-cache  # Rebuild from scratch
```

### Node modules issues
```bash
docker-compose down -v  # Remove all volumes
docker-compose up --build  # Rebuild from scratch
```

### Connect to running container shell
```bash
docker-compose exec smartats-dev sh
```

---

## 9. Next Steps

### Start Development Server:
```bash
cd /path/to/smartats-sats
docker-compose --profile dev up smartats-dev --build
```

Then open: `http://localhost:8080`

### Or start Production Server:
```bash
docker-compose up smartats-app --build
```

Then open: `http://localhost:3000`

---

**Status:** Docker environment is ready! Choose development or production mode above and we'll launch the application.
