import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

const baseUrl = 'https://ccp-docs.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: new Date() },
    ...source.getPages().map((page) => ({
      url: `${baseUrl}/docs/${page.slugs.join('/')}`,
      lastModified: new Date(),
    })),
  ];
}
