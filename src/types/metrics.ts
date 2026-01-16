/**
 * System Metrics Data Model
 * All metrics are sourced from VM-level metrics service
 */

export interface SystemMetrics {
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  uptime: UptimeMetrics;
  containers: ContainerMetrics;
  timestamp: string;
}

export interface CPUMetrics {
  usage: number; // percentage (0-100)
  status: MetricStatus;
}

export interface MemoryMetrics {
  percentage: number; // 0-100
  status: MetricStatus;
}

export interface DiskMetrics {
  percentage: number; // 0-100
  status: MetricStatus;
}

export interface UptimeMetrics {
  seconds: number;
  formatted: string; // e.g., "5d 12h 34m"
  status: MetricStatus;
}

export interface ContainerMetrics {
  running: number;
  total: number;
  status: MetricStatus;
}

export type MetricStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

/**
 * Service Links Data Model
 */

export interface ServiceLink {
  name: string;
  url: string;
  description: string;
  icon?: string;
  status?: 'online' | 'offline' | 'unknown';
}

/**
 * Complete Hub Config
 */

export interface HubConfig {
  name: string;
  tagline: string;
  services: ServiceLink[];
  metricsEndpoint: string;
  refreshInterval?: number; // seconds
}
