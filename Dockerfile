# Multi-stage build for optimized production image

# Stage 1: Build the Astro frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package.json package-lock.json* ./
RUN npm ci

# Copy frontend source
COPY . .

# Build the static site
RUN npm run build

# Stage 2: Setup the API server
FROM node:20-alpine AS api-builder

WORKDIR /app/api

# Copy API package files
COPY api/package.json api/package-lock.json* ./
RUN npm ci --production

# Copy API source
COPY api/ .

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Install serve to host the static frontend
RUN npm install -g serve

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist /app/dist

# Copy API from stage 2
COPY --from=api-builder /app/api /app/api

# Expose ports
# 4000 for frontend, 3001 for API
EXPOSE 4000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'cd /app/api && node index.js &' >> /app/start.sh && \
    echo 'cd /app && serve -s dist -l 4000 -n' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
