# =========================
# Stage 1: Build Astro frontend
# =========================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package.json package-lock.json* ./
RUN npm ci

# Copy frontend source
COPY . .

# Build the static site
RUN npm run build


# =========================
# Stage 2: Build API server
# =========================
FROM node:20-alpine AS api-builder

WORKDIR /app/api

# Copy API package files
COPY api/package.json api/package-lock.json* ./
RUN npm ci --production

# Copy API source
COPY api/ .


# =========================
# Stage 3: Production image
# =========================
FROM node:20-alpine

WORKDIR /app

# Install required runtime dependencies
# - docker-cli: needed for container count metrics
# - serve: static frontend hosting
RUN apk add --no-cache docker-cli \
    && npm install -g serve

# Copy built frontend
COPY --from=frontend-builder /app/dist /app/dist

# Copy API
COPY --from=api-builder /app/api /app/api

# Expose ports
# 4000 = frontend
# 3001 = API (container-internal; mapped by Docker)
EXPOSE 4000 3001

# Healthcheck (API-level)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Startup script
RUN printf '%s\n' \
  '#!/bin/sh' \
  'cd /app/api && node index.js &' \
  'cd /app && serve -s dist -l 4000 -n' \
  > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
