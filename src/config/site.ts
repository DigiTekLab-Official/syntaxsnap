// src/config/site.ts — links and revenue settings in one place.

export const EXTENSION_URL =
  'https://chromewebstore.google.com/detail/syntaxsnap-developer-tool/klglanlaodgndhpcaldmoeenjepiocfi';

export const CONTACT_EMAIL = 'contact@syntaxsnap.com';
export const SPONSOR_EMAIL = 'contact@syntaxsnap.com';

/** Agency funnel: custom tools and API work. */
export const HIRE_URL = 'https://digiteklab.com/?utm_source=syntaxsnap&utm_medium=referral&utm_campaign=hire';

/**
 * Carbon Ads (https://www.carbonads.net/publishers). Once approved, set these in
 * Cloudflare Pages → Settings → Environment variables, then redeploy:
 *   PUBLIC_CARBON_SERVE      e.g. CWYD52JY
 *   PUBLIC_CARBON_PLACEMENT  e.g. syntaxsnapcom
 * Until both are set, the ad slot shows a "Sponsor SyntaxSnap" house ad instead.
 */
export const CARBON_SERVE = import.meta.env.PUBLIC_CARBON_SERVE as string | undefined;
export const CARBON_PLACEMENT = import.meta.env.PUBLIC_CARBON_PLACEMENT as string | undefined;
export const ADS_ENABLED = Boolean(CARBON_SERVE && CARBON_PLACEMENT);

/**
 * Direct sponsors sold through /sponsor. They take priority over Carbon.
 * `scope` is 'site', a category key (e.g. 'json') or a tool id (e.g. 'jwt-debugger').
 * Example:
 *   { scope: 'json', name: 'Acme DB', line: 'Postgres that branches like Git.', url: 'https://acme.dev', logo: '/sponsors/acme.svg', until: '2026-12-31' }
 */
export interface Sponsor { scope: string; name: string; line: string; url: string; logo?: string; until?: string }
export const SPONSORS: Sponsor[] = [];

export function sponsorFor(toolId?: string, category?: string): Sponsor | undefined {
  const today = new Date().toISOString().slice(0, 10);
  const live = SPONSORS.filter((s) => !s.until || s.until >= today);
  return (
    live.find((s) => toolId && s.scope === toolId) ??
    live.find((s) => category && s.scope === category) ??
    live.find((s) => s.scope === 'site')
  );
}
