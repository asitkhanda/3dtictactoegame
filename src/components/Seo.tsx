import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_URL = 'https://twistedtac.com';
const SOCIAL_IMAGE = `${SITE_URL}/twisted-tac-thumbnail.png`;

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  indexable: boolean;
  schema?: Record<string, unknown>;
}

const HOME_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['VideoGame', 'WebApplication'],
      '@id': `${SITE_URL}/#game`,
      name: 'Twisted Tac',
      description:
        'A free browser-based 3D Tic-Tac-Toe game with layered boards, cross-layer winning lines, AI, local multiplayer, and online matches.',
      url: `${SITE_URL}/`,
      image: SOCIAL_IMAGE,
      applicationCategory: 'GameApplication',
      operatingSystem: 'Web browser',
      isAccessibleForFree: true,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      genre: ['Puzzle game', 'Strategy game', 'Board game'],
      playMode: ['SinglePlayer', 'MultiPlayer'],
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Twisted Tac',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/favicon.svg`,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Twisted Tac',
      url: `${SITE_URL}/`,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
} satisfies Record<string, unknown>;

function getPageMeta(pathname: string): PageMeta {
  if (pathname === '/') {
    return {
      title: 'Twisted Tac — 3D Tic-Tac-Toe',
      description:
        'Twisted Tac is a free browser-based 3D Tic-Tac-Toe game where you stack layers, strike through depth, and play against AI, friends locally, or opponents online.',
      canonical: `${SITE_URL}/`,
      indexable: true,
      schema: HOME_SCHEMA,
    };
  }

  if (pathname === '/leaderboard') {
    return {
      title: 'Twisted Tac Leaderboard — Hall of Fame',
      description:
        'See the top Twisted Tac players and compete for a place on the ranked 3D Tic-Tac-Toe leaderboard.',
      canonical: `${SITE_URL}/leaderboard`,
      indexable: true,
    };
  }

  if (pathname === '/privacy-policy') {
    return {
      title: 'Privacy Policy — Twisted Tac',
      description: 'Read the Twisted Tac privacy policy and learn how account and gameplay data are handled.',
      canonical: `${SITE_URL}/privacy-policy`,
      indexable: true,
    };
  }

  if (pathname === '/terms-of-service') {
    return {
      title: 'Terms of Service — Twisted Tac',
      description: 'Read the Twisted Tac terms governing access to the free browser-based game.',
      canonical: `${SITE_URL}/terms-of-service`,
      indexable: true,
    };
  }

  return {
    title: pathname === '/profile' ? 'Your Profile — Twisted Tac' : 'Play Twisted Tac',
    description: 'Play Twisted Tac, a layered 3D Tic-Tac-Toe game in your browser.',
    canonical: `${SITE_URL}${pathname}`,
    indexable: false,
  };
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }
  element.href = href;
}

export function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = getPageMeta(pathname);
    document.title = meta.title;

    setMeta('name', 'description', meta.description);
    setMeta('name', 'robots', meta.indexable ? 'index,follow' : 'noindex,nofollow');
    setMeta('property', 'og:url', meta.canonical);
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:image', SOCIAL_IMAGE);
    setMeta('property', 'og:image:alt', 'Twisted Tac layered 3D Tic-Tac-Toe board');
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:image', SOCIAL_IMAGE);
    setMeta('name', 'twitter:image:alt', 'Twisted Tac layered 3D Tic-Tac-Toe board');
    setCanonical(meta.canonical);

    const existingSchema = document.head.querySelector<HTMLScriptElement>('#twisted-tac-schema');
    if (existingSchema) existingSchema.remove();
    if (meta.schema) {
      const schema = document.createElement('script');
      schema.id = 'twisted-tac-schema';
      schema.type = 'application/ld+json';
      schema.textContent = JSON.stringify(meta.schema);
      document.head.appendChild(schema);
    }
  }, [pathname]);

  return null;
}
