import type { HubConfig } from '../types/metrics';

export const config: HubConfig = {
  name: 'Sentinel',
  tagline: 'Personal systems hub and curated public ingress.',
  metricsEndpoint: '/api/metrics',
  refreshInterval: 30, // seconds
  services: [
    {
      name: 'Portfolio',
      url: 'https://yourportfolio.com',
      description: 'Personal website and portfolio',
      icon: '🌐',
      status: 'online'
    },
    {
      name: 'Status Page',
      url: 'https://status.yoursite.com',
      description: 'Service availability and uptime',
      icon: '📊',
      status: 'online'
    },
    {
      name: 'GitHub',
      url: 'https://github.com/yourusername',
      description: 'Open source projects and contributions',
      icon: '💻',
      status: 'online'
    }
  ]
};
