// src/utils/schema.ts — Shared structured data (JSON-LD) builders
// ─────────────────────────────────────────────────────────────────
// Server-side only. Imported by .astro files (layouts, pages) to
// generate schema.org JSON-LD without duplication.
//
// IMPORTANT: Do NOT import this file in client-side .tsx components.
// ─────────────────────────────────────────────────────────────────

export const SITE_URL = 'https://syntaxsnap.com';
export const SITE_NAME = 'SyntaxSnap';

// ─── BREADCRUMBS ─────────────────────────────────────────────────
interface BreadcrumbItem {
  name: string;
  url: string;
}

/**
 * Generates a BreadcrumbList schema for tool pages.
 */
export function buildToolBreadcrumbs(toolName: string, toolSlug: string, pageUrl?: string) {
  return buildBreadcrumbList([
    { name: 'Home', url: SITE_URL },
    { name: 'Developer Tools', url: `${SITE_URL}/tools` },
    { name: toolName, url: `${SITE_URL}/tools/${toolSlug}` },
  ], pageUrl);
}

/** Generic BreadcrumbList builder. */
export function buildBreadcrumbList(items: BreadcrumbItem[], pageUrl?: string) {
  return {
    "@type": "BreadcrumbList",
    // Only attach an @id if a pageUrl is provided to connect it to the graph
    ...(pageUrl ? { "@id": `${pageUrl}#breadcrumb` } : {}),
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url,
    })),
  };
}

// ─── FAQ PAGE ────────────────────────────────────────────────────
interface FAQ {
  question: string;
  answer: string;
}

/**
 * Generates an FAQ schema block, ready to be pushed into a @graph.
 */
export function buildFAQPage(faqs: FAQ[], pageUrl: string) {
  return {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}

// ─── HOW-TO ──────────────────────────────────────────────────────
interface HowToStep {
  name: string;
  text: string;
}

/**
 * Generates a HowTo schema block, ready to be pushed into a @graph.
 */
export function buildHowTo(name: string, description: string, steps: HowToStep[], pageUrl: string) {
  return {
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    "name": name,
    "description": description,
    "step": steps.map((step, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": step.name,
      "text": step.text,
      "url": `${pageUrl}#step-${i + 1}`
    })),
  };
}

// ─── WEB APPLICATION (Homepage / Directory) ──────────────────────
export function buildWebApplication() {
  return {
    "@type": "WebApplication",
    "@id": `${SITE_URL}#webapplication`,
    "name": SITE_NAME,
    "url": SITE_URL,
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web Browser",
    "description": "Privacy-first suite of developer tools that run entirely in your browser. No servers. No tracking.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "author": { "@id": `${SITE_URL}/#organization` },
  };
}

// ─── ITEM LIST & COLLECTION PAGE ─────────────────────────────────
interface ListItem {
  name: string;
  url: string;
}

export function buildItemList(items: ListItem[]) {
  return {
    "@type": "ItemList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "url": item.url,
    })),
  };
}

export function buildCollectionPage(name: string, description: string, url: string, items: ListItem[]) {
  return {
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    "name": name,
    "description": description,
    "url": url,
    "isPartOf": { "@id": `${SITE_URL}/#website` },
    "mainEntity": buildItemList(items),
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────
export function extractToolName(pageTitle: string): string {
  return pageTitle.split(' | ')[0].trim();
}