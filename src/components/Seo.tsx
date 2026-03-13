import { useEffect } from 'react';
import { SITE_URL, type SeoSchema } from '../lib/seo';

interface SeoProps {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  schema?: SeoSchema;
  robots?: 'index,follow' | 'noindex,nofollow';
}

function upsertMetaByName(name: string, content: string): void {
  let element = document.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertMetaByProperty(property: string, content: string): void {
  let element = document.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export default function Seo({
  title,
  description,
  path,
  ogType = 'website',
  schema,
  robots = 'index,follow',
}: SeoProps): null {
  useEffect(() => {
    const canonicalUrl = new URL(path, SITE_URL).toString();
    document.title = title;

    upsertMetaByName('description', description);
    upsertMetaByProperty('og:type', ogType);
    upsertMetaByProperty('og:title', title);
    upsertMetaByProperty('og:description', description);
    upsertMetaByProperty('og:url', canonicalUrl);
    upsertMetaByName('twitter:card', 'summary');
    upsertMetaByName('twitter:title', title);
    upsertMetaByName('twitter:description', description);
    upsertMetaByName('robots', robots);
    upsertCanonical(canonicalUrl);

    const existingSchema = document.getElementById('seo-json-ld');
    if (existingSchema) {
      existingSchema.remove();
    }

    if (schema) {
      const script = document.createElement('script');
      script.id = 'seo-json-ld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    }
  }, [title, description, path, ogType, schema, robots]);

  return null;
}
