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

### Architecture: VM-Level Metrics

**Critical Design Principle**: Sentinel is a **renderer, not a sensor**.

Sentinel runs in a Docker container and **must not** compute system metrics itself. All system health metrics (CPU, memory, disk, uptime) are sourced from a VM-local metrics service.

**Authoritative Source**: `http://10.10.10.20:9101/metrics`

This service provides:
- **CPU**: VM-wide aggregate usage across all cores
- **Memory**: VM memory pressure (using MemAvailable)
- **Disk**: VM root filesystem usage
- **Uptime**: VM uptime (not container uptime)

**Why this matters**:
- Container metrics would reflect container limits, not VM reality
- Restarting Sentinel would reset uptime if computed locally
- CPU/memory readings inside containers are misleading
- This ensures metrics remain accurate across container restarts

**Caching**: Metrics are cached for 2-5 seconds to reduce load on the metrics service.

### SystemMetrics Interface

```typescript
interface SystemMetrics {
  cpu: CPUMetrics;           // VM CPU usage percentage
  memory: MemoryMetrics;     // VM memory usage percentage
  disk: DiskMetrics;         // VM disk usage percentage
  uptime: UptimeMetrics;     // VM uptime
  containers: ContainerMetrics; // Docker container count (local)
  timestamp: string;         // ISO timestamp
}
```

Each metric includes:
- **Value**: The actual measurement (rounded for display)
- **Status**: `healthy` | `warning` | `critical` | `unknown`

### VM Metrics Service Contract

The metrics service at `http://10.10.10.20:9101/metrics` returns:

```json
{
  "cpu": { "usage_percent": 12.4 },
  "memory": { "used_percent": 57.1 },
  "disk": { "used_percent": 63.8 },
  "uptime": { "seconds": 184293 }
}
```

Sentinel transforms this into a user-friendly format with status indicators.

### Security Considerations

Metrics are intentionally **sanitized** and **high-level**:

✅ **Included**:
- VM-wide aggregate CPU usage (percentage only)
- VM memory pressure (percentage only)
- VM disk usage (percentage only)
- VM uptime duration
- Container counts (running/total)

❌ **Excluded**:
- IP addresses
- Hostnames
- Hardware identifiers
- Process lists
- Container IDs, names, or labels
- Absolute memory/disk values (GB)
- Anything exploitable

#### Docker Socket Exposure

The container requires **read-only** access to the Docker socket **only for container counts**.

**Security measures**:
- Socket is mounted as read-only (`:ro`)
- Only aggregate counts are exposed via API (running/total)
- No container identifiers (IDs, names, labels) are ever returned
- Container is only accessible via reverse proxy
- API errors never leak internal details
- System metrics come from external service, not Docker API

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

#### Environment Variables

The API supports the following environment variables:

- `NODE_ENV`: Set to `production` for production mode (default: `development`)
- `API_PORT`: Port for the API server (default: `3001`)
- `VM_METRICS_URL`: URL of the VM metrics service (default: `http://10.10.10.20:9101/metrics`)

Configure in [docker-compose.yml](docker-compose.yml):

```yaml
environment:
  - NODE_ENV=production
  - API_PORT=3001
  - VM_METRICS_URL=http://10.10.10.20:9101/metrics
```

#### Application Configuration

Edit [src/config/index.ts](src/config/index.ts) to customize:
- Service links
- Hub name and tagline
- Metrics refresh interval (client-side)
- API endpoint (frontend)

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

Returns current system metrics (sourced from VM metrics service):

```json
{
  "cpu": {
    "usage": 12.4,
    "status": "healthy"
  },
  "memory": {
    "percentage": 57.1,
    "status": "healthy"
  },
  "disk": {
    "percentage": 63.8,
    "status": "healthy"
  },
  "uptime": {
    "seconds": 184293,
    "formatted": "2d 3h 11m",
    "status": "healthy"
  },
  "containers": {
    "running": 12,
    "total": 15,
    "status": "healthy"
  },
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

**Note**: CPU, memory, disk, and uptime are fetched from `http://10.10.10.20:9101/metrics` and represent VM-wide metrics, not container-local values. Container counts are queried locally via Docker API.

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
