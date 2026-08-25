import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/patients', '/appointments', '/team', '/platform', '/settings', '/login'],
    },
    sitemap: 'https://clinicos-crm.vercel.app/sitemap.xml',
  };
}
