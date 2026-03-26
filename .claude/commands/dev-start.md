# /dev-start

Start the SmartATS dev environment. Runs a fast pre-flight check, starts the `smartats-dev` container, and confirms the app is reachable at `http://localhost:8080`.

## Steps

### 1. Check Docker daemon

```bash
docker info > /dev/null 2>&1 && echo "running" || echo "stopped"
```

If stopped, launch Docker Desktop and wait up to 60s:
```bash
open -a Docker
for i in $(seq 1 12); do docker info &>/dev/null && echo "ready" && break || sleep 5; done
```

### 2. Check if already running

```bash
docker ps --filter "name=smartats-dev" --format "{{.Status}}"
```

If `Up` and healthy — report `http://localhost:8080` and stop. Nothing to do.

### 3. Quick build-context safety check

```bash
du -sh ~/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats/node_modules 2>/dev/null && echo "WARNING: node_modules on OneDrive" || true
du -sh ~/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats/scripts/playwright-linkedin/node_modules 2>/dev/null && echo "WARNING: playwright node_modules on OneDrive" || true
```

If any warning fires — remove before building:
```bash
rm -rf ~/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats/node_modules
rm -rf ~/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats/scripts/playwright-linkedin/node_modules
```

### 4. Start the dev container

```bash
cd ~/Library/CloudStorage/OneDrive-Personal/eIT/Git_Projects/smartats-sats && \
  docker compose --profile dev up smartats-dev --build --detach 2>&1
```

### 5. Wait for app ready

```bash
for i in $(seq 1 12); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
  if echo "$STATUS" | grep -qE "^(200|304|301|302)$"; then
    echo "✅ Dev server ready at http://localhost:8080"
    break
  fi
  echo "Waiting... ($i/12)"
  sleep 5
done
```

If not ready after 60s — run the `dev-env-doctor` agent to diagnose:

> Delegate to the `dev-env-doctor` agent with the message:
> "Dev container started but app is not responding at http://localhost:8080. Container logs: [paste output of `docker logs smartats-dev --tail 50`]. Diagnose and fix."

### 6. Report

Output:
- Container name and status
- URL: `http://localhost:8080`
- Build time (approximate)
- Any warnings found and resolved

If startup failed at any step, invoke the `dev-env-doctor` agent automatically.
