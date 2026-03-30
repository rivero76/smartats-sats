# Created: 2026-03-01 00:00:00 - Dockerfile for SmartATS LinkedIn scraper service.
# Updated: 2026-03-31 00:00:00 - Migrated from Railway to Fly.io (MVP-TEMPORARY — see INFRA-1).
# Uses the official Microsoft Playwright image which ships Chromium, Firefox,
# and WebKit with all OS-level dependencies pre-installed.
# Deploy with: fly deploy --config fly.toml (from scripts/playwright-linkedin/)

FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Install Node dependencies first (layer-cached until package.json changes)
COPY package*.json ./
RUN npm ci --omit=dev && \
    npx playwright install chromium

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm install --include=dev typescript && \
    npx tsc && \
    npm prune --omit=dev

# Railway sets PORT automatically — default 3000
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
