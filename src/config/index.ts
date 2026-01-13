import type { HubConfig } from '../types/metrics';

export const config: HubConfig = {
  name: 'Sentinel',
  tagline: 'Personal systems hub and curated public ingress.',
  metricsEndpoint: '/api/metrics',
  refreshInterval: 30, // seconds
  services: [
    {
      name: 'Portfolio',
      url: 'https://lpearson.dev/',
      description: 'Learn about me and my passions',
      icon: '🌐',
      status: 'online'
    },
    {
      name: 'Status Page',
      url: 'https://status.srv.lpearson.dev/status/public',
      description: 'Service availability and uptime for public services',
      icon: '📊',
      status: 'online'
    },
    {
      name: 'GitHub',
      url: 'https://github.com/lpears0n',
      description: 'Open source projects and contributions',
      icon: '💻',
      status: 'online'
    }
  ]
};
