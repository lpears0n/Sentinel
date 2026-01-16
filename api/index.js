import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.API_PORT || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sentinel API listening on ${PORT}`)
})

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// VM metrics service configuration
const VM_METRICS_URL = process.env.VM_METRICS_URL || 'http://10.10.10.20:9101/metrics';
const CACHE_TTL_MS = 3000; // 3 seconds cache

// Disable Express stack traces in production
if (IS_PRODUCTION) {
  app.set('env', 'production');
}

// Middleware
app.use(cors());
app.use(express.json());

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(10000); // 10 second timeout
  res.setTimeout(10000);
  next();
});

/**
 * Metrics cache
 */
let cachedMetrics = null;
let cacheTimestamp = 0;

/**
 * Calculate metric status based on thresholds
 */
function getMetricStatus(percentage, criticalThreshold = 90, warningThreshold = 75) {
  if (percentage >= criticalThreshold) return 'critical';
  if (percentage >= warningThreshold) return 'warning';
  return 'healthy';
}

/**
 * Fetch VM metrics from authoritative source
 */
async function fetchVMMetrics() {
  const now = Date.now();
  
  // Return cached metrics if still fresh
  if (cachedMetrics && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedMetrics;
  }

  try {
    const response = await fetch(VM_METRICS_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`VM metrics service returned ${response.status}`);
    }

    const vmData = await response.json();

    // Cache the response
    cachedMetrics = vmData;
    cacheTimestamp = now;

    return vmData;
  } catch (error) {
    console.error('[VM Metrics Fetch Error]', error.message);
    
    // Return cached data if available, even if stale
    if (cachedMetrics) {
      console.warn('[VM Metrics] Using stale cache due to fetch error');
      return cachedMetrics;
    }
    
    throw error;
  }
}

/**
 * Format uptime seconds to human-readable string
 */
function formatUptime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '—';
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${days}d ${hours}h ${minutes}m`;
}

/**
 * Get container metrics (requires Docker)
 * SECURITY: Only aggregated counts are exposed.
 */
async function getContainerMetrics() {
  try {
    // Try to get Docker container stats (counts only)
    const { stdout: runningOutput } = await execAsync('docker ps -q | wc -l');
    const { stdout: totalOutput } = await execAsync('docker ps -a -q | wc -l');
    
    const running = parseInt(runningOutput.trim(), 10) || 0;
    const total = parseInt(totalOutput.trim(), 10) || 0;
    
    // Aggregate counts only - no identifiable information
    return {
      running,
      total,
      status: running === total ? 'healthy' : 'warning'
    };
  } catch (error) {
    // Fallback if Docker is not available (no error details exposed)
    return {
      running: 0,
      total: 0,
      status: 'unknown'
    };
  }
}

/**
 * Main metrics endpoint
 * Fetches VM-wide system metrics from authoritative source
 */
app.get('/api/metrics', async (_req, res) => {
  try {
    // Fetch VM metrics and container count in parallel
    const [vmMetrics, containers] = await Promise.all([
      fetchVMMetrics(),
      getContainerMetrics()
    ]);

    // VM metrics are authoritative - validate and sanitize
    const cpuUsage = typeof vmMetrics?.cpu?.usage_percent === 'number' 
      ? Math.round(vmMetrics.cpu.usage_percent * 10) / 10 
      : null;
    
    const memUsed = typeof vmMetrics?.memory?.used_percent === 'number'
      ? Math.round(vmMetrics.memory.used_percent * 10) / 10
      : null;
    
    const diskUsed = typeof vmMetrics?.disk?.used_percent === 'number'
      ? Math.round(vmMetrics.disk.used_percent * 10) / 10
      : null;
    
    const uptimeSeconds = typeof vmMetrics?.uptime?.seconds === 'number'
      ? vmMetrics.uptime.seconds
      : null;

    // Build response with sanitized values
    const metrics = {
      cpu: {
        usage: cpuUsage !== null ? cpuUsage : 0,
        status: cpuUsage !== null ? getMetricStatus(cpuUsage) : 'unknown'
      },
      memory: {
        percentage: memUsed !== null ? memUsed : 0,
        status: memUsed !== null ? getMetricStatus(memUsed) : 'unknown'
      },
      disk: {
        percentage: diskUsed !== null ? diskUsed : 0,
        status: diskUsed !== null ? getMetricStatus(diskUsed) : 'unknown'
      },
      uptime: {
        seconds: uptimeSeconds !== null ? uptimeSeconds : 0,
        formatted: formatUptime(uptimeSeconds),
        status: uptimeSeconds !== null ? 'healthy' : 'unknown'
      },
      containers,
      timestamp: new Date().toISOString()
    };

    res.json(metrics);
  } catch (error) {
    // Log detailed error server-side only
    console.error('[Metrics Error]', error.message);
    
    // Return fallback metrics with unknown status (fail closed)
    res.status(200).json({ 
      cpu: { usage: 0, status: 'unknown' },
      memory: { percentage: 0, status: 'unknown' },
      disk: { percentage: 0, status: 'unknown' },
      uptime: { seconds: 0, formatted: '—', status: 'unknown' },
      containers: { running: 0, total: 0, status: 'unknown' },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  // Log error details server-side only
  console.error('[API Error]', err.message);
  
  // Generic error response (never leak stack traces)
  res.status(err.status || 500).json({
    error: IS_PRODUCTION ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Sentinel API running on http://0.0.0.0:${PORT}`);
  console.log(`Metrics endpoint: http://0.0.0.0:${PORT}/api/metrics`);
  console.log(`Environment: ${IS_PRODUCTION ? 'production' : 'development'}`);
});
