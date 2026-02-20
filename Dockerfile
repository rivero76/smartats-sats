# UPDATE LOG
# 2026-02-20 22:19:11 | Reviewed last-2-hours updates and documented the healthcheck target change to 127.0.0.1:3000.

# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

WORKDIR /app

# Declare build-time env vars so Vite can embed them into the bundle
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_LOGGING_ENABLED
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_LOGGING_ENABLED=$VITE_LOGGING_ENABLED

# Copy package files
COPY package.json package-lock.json* bun.lockb* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application (VITE_ vars are baked into the bundle here)
RUN npm run build

# Production stage — nginx:alpine eliminates all node/npm CVEs from the runtime image
FROM nginx:alpine

# Apply available OS-level security patches
RUN apk upgrade --no-cache

# SPA nginx config (handles React Router client-side routes)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000 || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
