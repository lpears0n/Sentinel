# Sentinel

A modern, production-ready personal systems hub that serves as a curated observability surface for infrastructure. Intentionally read-only, security-conscious, and designed as a long-lived platform.

## Architecture

```
Internet → Caddy Reverse Proxy → Private VM → Sentinel Container → Metrics Sources
```

### Tech Stack

- **Frontend**: Astro + Tailwind CSS
- **API**: Node.js + Express
- **Deployment**: Docker + docker-compose
- **Reverse Proxy**: Caddy (external)

## Project Structure

```
sentinel/
├── src/
│   ├── components/          # Astro components
│   │   ├── MetricCard.astro
│   │   ├── ServiceLink.astro
│   │   └── ThemeToggle.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   └── index.astro
│   ├── types/
│   │   └── metrics.ts      # TypeScript interfaces
│   └── config/
│       └── index.ts        # App configuration
├── api/
│   ├── index.js            # Metrics API server
│   └── package.json
├── public/                 # Static assets
├── Dockerfile
├── docker-compose.yml
└── astro.config.mjs
```

## Metrics Data Model

### SystemMetrics Interface

```typescript
interface SystemMetrics {
  cpu: CPUMetrics;           // CPU usage percentage
  memory: MemoryMetrics;     // Memory usage (used/total GB)
  disk: DiskMetrics;         // Disk usage (used/total GB)
  uptime: UptimeMetrics;     // System uptime
  containers: ContainerMetrics; // Docker container count
  timestamp: string;         // ISO timestamp
}
```

Each metric includes:
- **Value**: The actual measurement
- **Status**: `healthy` | `warning` | `critical` | `unknown`

### Security Considerations

Metrics are intentionally **sanitized** and **high-level**:

✅ **Included**:
- Aggregate CPU usage
- Memory/disk usage (GB)
- Uptime duration
- Container counts

❌ **Excluded**:
- IP addresses
- Hostnames
- Hardware identifiers
- Process lists
- Container IDs, names, or labels
- Anything exploitable

#### Docker Socket Exposure

The container requires **read-only** access to the Docker socket for container metrics.

**Security measures**:
- Socket is mounted as read-only (`:ro`)
- Only aggregate counts are exposed via API
- No container identifiers (IDs, names, labels) are ever returned
- Container is only accessible via reverse proxy
- API errors never leak internal details

**Future hardening options**:
- Move metrics collection to a dedicated sidecar container
- Use Docker API with limited permissions
- Implement metrics caching layer

## Development

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or pnpm

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   cd api && npm install && cd ..
   ```

2. **Run development servers**:
   
   Terminal 1 (Frontend):
   ```bash
   npm run dev
   ```
   
   Terminal 2 (API):
   ```bash
   cd api
   npm run dev
   ```

3. **Access**:
   - Frontend: http://localhost:4000
   - API: http://localhost:3001/api/metrics

### Configuration

Edit [src/config/index.ts](src/config/index.ts) to customize:
- Service links
- Hub name and tagline
- Metrics refresh interval
- API endpoint

## Production Deployment

### Build & Run with Docker

1. **Build the container**:
   ```bash
   docker-compose build
   ```

2. **Run the container**:
   ```bash
   docker-compose up -d
   ```

3. **Configure your reverse proxy** (Caddy example):
   ```caddyfile
   hub.yourdomain.com {
       reverse_proxy 10.10.10.20:4000
   }
   ```

### Important: Network Configuration

The docker-compose file binds to a **private IP** (`10.10.10.20`). Update this to match your VM's private network configuration:

```yaml
ports:
  - "YOUR_PRIVATE_IP:4000:4000"
  - "YOUR_PRIVATE_IP:3001:3001"
```

**Never expose directly to `0.0.0.0` in production.**

### Docker Socket Access

The container needs read-only access to Docker socket for container metrics:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

This is **read-only** and used only for aggregate container counts. No container IDs, names, or labels are ever exposed.

## Production Readiness

### Error Handling

The API implements production-grade error handling:
- ✅ No stack traces leak to clients
- ✅ Generic error messages only
- ✅ Detailed logging server-side
- ✅ Request timeouts (10s)
- ✅ Global error handler

### UI Polish

- ✅ Data freshness indicator ("Updated 12s ago")
- ✅ Security scope disclaimer in footer
- ✅ Smooth animations and transitions
- ✅ Accessible, semantic HTML
- ✅ System-aware dark mode

### Monitoring

The application is observable and maintainable:
- Health check endpoint at `/health`
- Container health checks in Docker
- Structured logging
- Clear error messages in logs

## UI/UX Features

- ✨ Dark/light mode (system-aware, persisted)
- 🎨 Rounded cards with soft shadows
- 🌊 Subtle hover animations and lift effects
- 📱 Responsive, desktop-first layout
- 🎯 Clean typography (Inter font)
- ⚡ Optional auto-refresh (30s interval)

## Metrics API

### Endpoints

#### `GET /api/metrics`

Returns current system metrics:

```json
{
  "cpu": {
    "usage": 42.5,
    "status": "healthy"
  },
  "memory": {
    "used": 12.4,
    "total": 32,
    "percentage": 38.75,
    "status": "healthy"
  },
  "disk": {
    "used": 245,
    "total": 512,
    "percentage": 47.85,
    "status": "healthy"
  },
  "uptime": {
    "days": 5,
    "hours": 12,
    "minutes": 34,
    "formatted": "5d 12h 34m",
    "status": "healthy"
  },
  "containers": {
    "running": 12,
    "total": 15,
    "status": "healthy"
  },
  "timestamp": "2026-01-12T10:30:00.000Z"
}
```

#### `GET /health`

Health check endpoint for monitoring:

```json
{
  "status": "ok",
  "timestamp": "2026-01-12T10:30:00.000Z"
}
```

## Customization

### Adding New Metrics

1. Update the TypeScript interface in [src/types/metrics.ts](src/types/metrics.ts)
2. Add data collection logic in [api/index.js](api/index.js)
3. Create/update UI component in [src/components/](src/components/)
4. Add to main page in [src/pages/index.astro](src/pages/index.astro)

### Styling

Tailwind configuration: [tailwind.config.mjs](tailwind.config.mjs)

CSS variables for theming: [src/layouts/BaseLayout.astro](src/layouts/BaseLayout.astro)

## Monitoring

Container includes a health check that verifies:
- Frontend is serving correctly
- API is responding

Check container health:
```bash
docker ps
docker inspect sentinel-hub
```

View logs:
```bash
docker logs sentinel-hub
docker logs -f sentinel-hub  # Follow logs
```

## License

MIT

## Notes

This is a **read-only observability surface**, not a control panel. It's designed to be:
- Secure by default
- Intentionally limited in scope
- Portfolio-grade quality
- Production-ready

No write operations, no admin access, no sensitive data exposure.

### Design Philosophy

Sentinel is built as a **long-lived platform**:
- The front door to your infrastructure
- A stable foundation that evolves slowly
- Opinionated defaults that communicate intent
- Clean separation between data and presentation

### Future Enhancements

Potential improvements (not required, but considered):
- Metrics caching layer for reduced system load
- Historical data visualization (sparklines)
- Service health checks (ping endpoints)
- Alert thresholds configuration
- Sidecar architecture for metrics collection
