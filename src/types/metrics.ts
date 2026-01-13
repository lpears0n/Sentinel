/**
 * System Metrics Data Model
 * All metrics are sanitized and high-level only
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
  used: number; // GB
  total: number; // GB
  percentage: number; // 0-100
  status: MetricStatus;
}

export interface DiskMetrics {
  used: number; // GB
  total: number; // GB
  percentage: number; // 0-100
  status: MetricStatus;
}

export interface UptimeMetrics {
  days: number;
  hours: number;
  minutes: number;
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
