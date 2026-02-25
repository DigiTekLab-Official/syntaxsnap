// src/utils/schema.ts — Shared structured data (JSON-LD) builders
// ─────────────────────────────────────────────────────────────────
// Server-side only. Imported by .astro files (layouts, pages) to
// generate schema.org JSON-LD without duplication.
//
// IMPORTANT: Do NOT import this file in client-side .tsx components.
// All JSON-LD must be injected server-side in <head> or the Astro
// template body via <script type="application/ld+json">.
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
 * Structure: Home → Tools → {toolName}
 */
export function buildToolBreadcrumbs(toolName: string, toolSlug: string) {
  return buildBreadcrumbList([
    { name: 'Home', url: SITE_URL },
    { name: 'Developer Tools', url: `${SITE_URL}/tools` },
    { name: toolName, url: `${SITE_URL}/tools/${toolSlug}` },
  ]);
}

/** Generic BreadcrumbList builder for any navigation chain. */
export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
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
 * Generates a standalone FAQPage JSON-LD block.
 * Inject as a separate <script type="application/ld+json"> tag.
 *
 * Rules:
 * - Only include FAQs whose answers are visible or contextually
 *   supported by the page content.
 * - 3–5 FAQs recommended; avoid exceeding 6.
 */
export function buildFAQPage(faqs: FAQ[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
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
 * Generates a HowTo JSON-LD block for tools with clear sequential
 * workflows. Not applicable to simple input→output converters.
 */
export function buildHowTo(
  name: string,
  description: string,
  steps: HowToStep[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    "step": steps.map((step, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": step.name,
      "text": step.text,
    })),
  };
}

// ─── WEB APPLICATION ─────────────────────────────────────────────

/**
 * Generates a WebApplication schema representing the SyntaxSnap
 * platform as a whole. Apply on the homepage and /tools index.
 * Does NOT conflict with per-tool SoftwareApplication schemas.
 */
export function buildWebApplication() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": SITE_NAME,
    "url": SITE_URL,
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "description":
      "Privacy-first suite of developer tools that run entirely in your browser. No servers. No tracking.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
    "author": { "@id": `${SITE_URL}/#organization` },
  };
}

// ─── ITEM LIST ───────────────────────────────────────────────────

interface ListItem {
  name: string;
  url: string;
}

/**
 * Generates an ItemList for directory/catalog pages so Google
 * understands the full tool inventory.
 */
export function buildItemList(items: ListItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "url": item.url,
    })),
  };
}

// ─── COLLECTION PAGE ─────────────────────────────────────────────

/**
 * Generates a CollectionPage schema for category groupings.
 * Each category page should reflect real navigation and content.
 */
export function buildCollectionPage(
  name: string,
  description: string,
  url: string,
  items: ListItem[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": name,
    "description": description,
    "url": url,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": items.map((item, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "name": item.name,
        "url": item.url,
      })),
    },
  };
}

// ─── HELPERS ─────────────────────────────────────────────────────

/**
 * Extracts a clean display name from a page title by stripping the
 * " | SyntaxSnap" suffix (and any intermediate segments like
 * " | Pure CSS & Tailwind | SyntaxSnap").
 */
export function extractToolName(pageTitle: string): string {
  return pageTitle.split(' | ')[0].trim();
}
