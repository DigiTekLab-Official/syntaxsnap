// src/config/tools.ts — Central Tools Registry (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────
//
// Architecture decisions (2026):
//
// 1. CATEGORY_META `as const` — ToolCategory is *derived* from this object's
//    keys. Adding a new category is a one-line change; the union updates
//    automatically with zero duplication and full compile-time enforcement.
//
// 2. STATUS_VALUES `as const` — Same derived-union pattern for status badges.
//
// 3. LucideAstroIcon — Extracted via `typeof` from a single icon import so it
//    tracks upstream type changes (lucide-astro 0.556+) without manual upkeep.
//
// 4. Template-literal Tailwind types — Enough safety to catch typos like
//    `txet-blue-400` without an exhaustive union that breaks on config changes.
//
// 5. href: `/${string}` — Guarantees every route starts with `/` at compile
//    time, matching Astro's `src/pages` directory convention.
//
// ─────────────────────────────────────────────────────────────────────────────

import {
  Braces,
  Clock,
  Container,
  Code2,
  Database,
  FileType,
  FileText,
  FileCode2,
  GitCompare,
  GlassWater,
  Layers,
  Palette,
  Share2,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  TableProperties,
  Workflow,
  Zap,
  Wand2,
  FileJson,
  Bot,
  Network,
  FileKey,
  Blend,
  AlignLeft,
  FileType2,
  Binary,
  Link2,
  Fingerprint,
  CalendarClock,
  Droplets,
} from 'lucide-astro';

// ─── CATEGORY REGISTRY ───────────────────────────────────────────────────────
// Add new categories here — ToolCategory is derived automatically.

const CATEGORY_META = {
  ai: {
    title: 'AI & Prompt Engineering Tools',
    subtitle: 'Streamline your LLM workflows.',
    description: 'Optimize your AI development with our suite of privacy-first tools. From generating mock data with local LLMs to optimizing prompts for Claude and GPT, these utilities help you build smarter applications without leaking sensitive data to the cloud.',
  },
  json: {
    title: 'JSON & Schema Utilities',
    subtitle: 'Validate, convert, and type-safe your data.',
    description: 'Handle complex data structures with ease. Our JSON tools allow you to convert raw objects to Zod schemas, TypeScript interfaces, or JSON Schema instantly. Perfect for frontend developers building robust API integrations with 100% client-side processing.',
  },
  css: {
    title: 'CSS & Design Tools',
    subtitle: 'Prototype stunning UI in seconds.',
    description: 'Generate production-ready CSS effects, gradients, and visual styles directly in your browser. From glassmorphism panels to aurora gradients and Tailwind shadow builders, these tools let you prototype stunning UI without leaving your workflow — and copy clean, framework-agnostic code in one click.',
  },
  dev: {
    title: 'Developer Utilities',
    subtitle: 'Everyday tools that respect your privacy.',
    description: 'A curated set of everyday developer utilities that run entirely client-side. Debug JWTs, compare text diffs, convert SQL to Prisma schemas, describe cron expressions in plain English, generate Dockerfiles, and more — all without sending a single byte to a server.',
  },
  data: {
    title: 'Data Conversion Tools',
    subtitle: 'Bridge formats across your stack.',
    description: 'Quickly convert between popular data formats used across the modern stack. Whether you need to turn SQL query results into JSON, transform GraphQL types into Zod validators, or bridge Pydantic models to TypeScript — these converters handle the grunt work so you can ship faster.',
  },
} as const;

export type ToolCategory = keyof typeof CATEGORY_META;
export const TOOL_CATEGORIES = CATEGORY_META;

// ─── STATUS REGISTRY ─────────────────────────────────────────────────────────

const STATUS_VALUES = ['New', 'Live', 'Popular'] as const;
export type ToolStatus = (typeof STATUS_VALUES)[number];

// ─── TAILWIND UTILITY TYPES ─────────────────────────────────────────────────

type TailwindTextColor = `text-${string}`;
type TailwindBgColor = `bg-${string}`;

// ─── ICON TYPE ───────────────────────────────────────────────────────────────
// All lucide-astro exports share the same Astro component signature.

type LucideAstroIcon = typeof Database;

// ─── TOOL INTERFACE ──────────────────────────────────────────────────────────

export interface Tool {
  /** URL-safe slug — must match `src/pages/tools/<id>.astro` filename */
  id: string;
  /** Display name shown in cards and headings */
  title: string;
  /** SEO meta description (120–155 chars, action-oriented, privacy-aware) */
  desc: string;
  /** Route path — must mirror `src/pages` directory structure */
  href: `/${string}`;
  /** Lucide Astro icon component — must be unique per tool */
  icon: LucideAstroIcon;
  /** Lifecycle status badge */
  status: ToolStatus;
  /** Tailwind text color class for icon / badge accent */
  color: TailwindTextColor;
  /** Tailwind background color class for card accent */
  bg: TailwindBgColor;
  /** Functional category for filtering and related-tool grouping */
  category: ToolCategory;
  /** True when the tool sends input to a server (shown in the status bar). Default: runs locally. */
  network?: boolean;
  /** Short label for sidebars and the status bar (defaults to title) */
  short?: string;
}

// ─── TOOLS REGISTRY ──────────────────────────────────────────────────────────

export const TOOLS: Tool[] = [
  {
    id: 'ai-mock-generator',
    title: 'AI Mock Generator',
    desc: 'Describe the data you need in plain English and get realistic JSON mock records. Your prompt is sent to OpenAI to generate the result; nothing is stored.',
    network: true,
    href: '/tools/ai-mock-generator',
    icon: Sparkles,
    status: 'Live',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    category: 'ai',
  },
  {
    id: 'openapi-to-express',
    title: 'OpenAPI to Express',
    desc: 'Transform OpenAPI 3.x specifications into production-ready Express.js route handlers with validation middleware. Fully client-side processing.',
    href: '/tools/openapi-to-express',
    icon: Server,
    status: 'Live',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    category: 'dev',
  },
  {
    id: 'pydantic-to-zod',
    title: 'Pydantic to Zod',
    desc: 'Convert Python Pydantic models and FastAPI JSON schemas into TypeScript Zod validation schemas. Client-side processing, zero data transmission.',
    href: '/tools/pydantic-to-zod',
    icon: Braces,
    status: 'Live',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    category: 'json',
  },
  {
    id: 'diff-viewer',
    title: 'Diff Viewer',
    desc: 'Compare code snippets, configuration files, or plain text side-by-side with syntax-highlighted inline and unified diffs. Nothing leaves your browser.',
    href: '/tools/diff-viewer',
    icon: GitCompare,
    status: 'Live',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    category: 'dev',
  },
  {
    id: 'jwt-debugger',
    title: 'JWT Debugger',
    desc: 'Decode, inspect, and validate JWT token headers and payloads without sending credentials to any server. Fully offline, privacy-first debugging.',
    href: '/tools/jwt-debugger',
    icon: ShieldCheck,
    status: 'Live',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    category: 'dev',
  },
  {
    id: 'json-to-zod',
    title: 'JSON to Zod',
    desc: 'Paste any JSON object and infer a complete Zod validation schema with nested types, optionals, and arrays. No server round-trips — 100% in-browser.',
    href: '/tools/json-to-zod',
    icon: Database,
    status: 'Live',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    category: 'json',
  },
  {
    id: 'regex-tester',
    title: 'Regex Tester',
    desc: 'Write, test, and debug JavaScript regular expressions with real-time match highlighting and capture group inspection. Fully local execution.',
    href: '/tools/regex-tester',
    icon: Search,
    status: 'Live',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    category: 'dev',
  },
  {
    id: 'mesh-gradient',
    title: 'Mesh Gradient',
    desc: 'Design smooth multi-point mesh gradients with an interactive visual editor and export production-ready CSS. No accounts, no tracking, no data collection.',
    href: '/tools/mesh-gradient',
    icon: Palette,
    status: 'Live',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    category: 'css',
  },
  {
    id: 'glass-generator',
    title: 'Glassmorphism',
    desc: 'Build frosted glassmorphism UI components with live preview controls for blur, transparency, and border radius. Copy production-ready CSS directly.',
    href: '/tools/glass-generator',
    icon: GlassWater,
    status: 'Live',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    category: 'css',
  },
  {
    id: 'svg-to-jsx',
    title: 'SVG to JSX',
    desc: 'Convert raw SVG markup into clean React JSX or TSX components with automatic attribute conversion and prop forwarding. Processed locally, nothing uploaded.',
    href: '/tools/svg-to-jsx',
    icon: FileCode2,
    status: 'Live',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    category: 'dev',
  },
  {
    id: 'openapi-mock',
    title: 'OpenAPI Mock',
    desc: 'Generate a zero-dependency mock API server from any OpenAPI 3.x specification with realistic example responses. Runs entirely inside your browser.',
    href: '/tools/openapi-mock',
    icon: Zap,
    status: 'Live',
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    category: 'dev',
  },
  {
    id: 'cron-descriptor',
    title: 'Cron Translator',
    desc: 'Translate cron expressions into plain English descriptions and preview upcoming scheduled run times. Offline-first processing with zero telemetry.',
    href: '/tools/cron-descriptor',
    icon: Clock,
    status: 'Live',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    category: 'dev',
  },
  {
    id: 'sql-to-json',
    title: 'SQL to JSON Schema',
    desc: 'Parse SQL CREATE TABLE statements into valid JSON Schema definitions with column type mapping, constraints, and nullability. Runs entirely in-browser.',
    href: '/tools/sql-to-json',
    icon: TableProperties,
    status: 'Live',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    category: 'data',
  },
  {
    id: 'graphql-to-trpc',
    title: 'GraphQL to tRPC',
    desc: 'Convert GraphQL type definitions into fully typed tRPC router procedures with auto-generated Zod input validation. Client-side only, zero uploads.',
    href: '/tools/graphql-to-trpc',
    icon: Workflow,
    status: 'Live',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    category: 'dev',
  },
  {
    id: 'dockerfile-generator',
    title: 'Dockerfile Generator',
    desc: 'Generate optimized multi-stage Dockerfiles for Node.js, Next.js, and Astro projects with security best practices and health checks built in.',
    href: '/tools/dockerfile-generator',
    icon: Container,
    status: 'Live',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    category: 'dev',
  },
  {
    id: 'prisma-to-zod',
    title: 'Prisma to Zod',
    desc: 'Transform Prisma schema models into type-safe Zod validation schemas with field constraints, enums, and relation handling. Browser-only processing.',
    href: '/tools/prisma-to-zod',
    icon: Layers,
    status: 'Live',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    category: 'data',
  },
  {
    id: 'aurora-gradient',
    title: 'Aurora Gradient Generator',
    desc: 'Create animated, pure CSS aurora backgrounds and mesh gradients. Generate Tailwind classes or raw CSS instantly. 100% local, privacy-first execution.',
    href: '/tools/aurora-gradient',
    icon: Wand2,
    status: 'Popular',
    color: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    category: 'css',
  },
  {
    id: 'json-schema-to-zod',
    title: 'JSON Schema to Zod',
    desc: 'Convert JSON Schema definitions into type-safe Zod validation schemas. Supports nested objects, arrays, and complex constraints with zero data transmission.',
    href: '/tools/json-schema-to-zod',
    icon: FileJson,
    status: 'Live',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    category: 'json',
  },
  {
    id: 'zod-to-prompt',
    title: 'Zod to LLM Prompt',
    desc: 'Convert TypeScript Zod schemas into optimized LLM system prompts. Force Claude, GPT-4, and Gemini to return perfectly structured, predictable JSON.',
    href: '/tools/zod-to-prompt',
    icon: Bot,
    status: 'Live',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    category: 'ai',
  },
  {
    id: 'trpc-to-openapi',
    title: 'tRPC to OpenAPI',
    desc: 'Instantly convert tRPC routers and Zod input/output schemas into standard OpenAPI (Swagger) 3.1.0 specifications for public API documentation.',
    href: '/tools/trpc-to-openapi',
    icon: Network,
    status: 'Live',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    category: 'dev',
  },
  {
    id: 'openapi-to-zod',
    title: 'OpenAPI to Zod',
    desc: 'Parse OpenAPI 3.x specifications and instantly generate TypeScript Zod validation schemas for all components. 100% client-side execution.',
    href: '/tools/openapi-to-zod',
    icon: FileJson,
    status: 'Popular',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    category: 'json',
  },
  {
    id: 'ts-to-zod',
    title: 'TypeScript to Zod',
    desc: 'Instantly convert TypeScript interfaces and types into Zod validation schemas. 100% client-side execution for total privacy.',
    href: '/tools/ts-to-zod',
    icon: FileType,
    status: 'Live',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    category: 'dev',
  },
  {
    id: 'env-to-zod',
    title: 'Env to Zod',
    desc: 'Convert .env files into strict, type-safe Zod validation schemas for Next.js and Node.js. Infers URLs, emails, booleans, and numbers automatically.',
    href: '/tools/env-to-zod',
    icon: FileKey,
    status: 'Live',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    category: 'dev',
  },
  {
    id: 'tailwind-shadow-generator',
    title: 'Tailwind Shadow Gen',
    desc: 'Visually design multi-layered box shadows and neon glows, then instantly copy the Tailwind CSS v4 arbitrary class. 100% free and offline.',
    href: '/tools/tailwind-shadow-generator',
    icon: Blend,
    status: 'Popular',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    category: 'css',    
  },
  {
    id: 'tailwind-to-css',
    title: 'Tailwind to CSS',
    desc: 'Convert Tailwind utility classes into standard Vanilla CSS rulesets and variables. Perfect for migrating components out of Tailwind.',
    href: '/tools/tailwind-to-css',
    icon: FileCode2,
    status: 'Live',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    category: 'css',
  },
  {
    id: 'meta-tag-generator',
    title: 'Meta Tag Previewer',
    desc: 'Visually preview and generate Open Graph, Twitter, and standard HTML meta tags. Instantly copy raw HTML or Next.js metadata objects.',
    href: '/tools/meta-tag-generator',
    icon: Share2, 
    status: 'Live',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    category: 'dev',
  },
  {
    id: 'ts-to-json-schema',
    title: 'TypeScript to JSON Schema',
    desc: 'Convert TypeScript interfaces and types into standard JSON Schema. 100% offline client-side parsing.',
    href: '/tools/ts-to-json-schema',
    icon: Code2, 
    status: 'Live',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    category: 'dev',
  },
  {
    id: 'json-schema-to-ts',
    title: 'JSON Schema to TypeScript',
    desc: 'Convert JSON Schema definitions into clean TypeScript interfaces. Handles objects, arrays, enums, and $ref. 100% client-side.',
    href: '/tools/json-schema-to-ts',
    icon: Braces,
    status: 'Live',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    category: 'json',
  },
  {
    id: 'sql-to-prisma',
    title: 'SQL to Prisma Schema',
    desc: 'Convert SQL CREATE TABLE statements into Prisma schema models. 100% offline client-side parsing.',
    href: '/tools/sql-to-prisma',
    icon: Database,
    status: 'Popular',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    category: 'dev',
  },
  {
    id: 'graphql-to-zod',
    title: 'GraphQL to Zod',
    desc: 'Convert GraphQL type definitions into type-safe Zod validation schemas. 100% offline client-side parsing.',
    href: '/tools/graphql-to-zod',
    icon: FileJson,
    status: 'Live',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    category: 'dev',
  },

  // ── High-volume everyday tools (added Oct 2026) ──────────────────────────
  {
    id: 'json-formatter',
    title: 'JSON Formatter & Validator',
    short: 'JSON Formatter',
    desc: 'Format, validate and minify JSON with exact error line and column. Sort keys, pick indentation, and copy the result. Runs entirely in your browser.',
    href: '/tools/json-formatter',
    icon: AlignLeft,
    status: 'New',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    category: 'json',
  },
  {
    id: 'json-to-typescript',
    title: 'JSON to TypeScript',
    desc: 'Paste a JSON response and get clean TypeScript interfaces or type aliases, with nested types named for you. Nothing is uploaded.',
    href: '/tools/json-to-typescript',
    icon: FileType2,
    status: 'New',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    category: 'json',
  },
  {
    id: 'base64',
    title: 'Base64 Encode & Decode',
    short: 'Base64',
    desc: 'Encode text to Base64 or decode it back, with full UTF-8 support and a URL-safe option. Handy for auth headers and data URIs.',
    href: '/tools/base64',
    icon: Binary,
    status: 'New',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    category: 'dev',
  },
  {
    id: 'url-encoder',
    title: 'URL Encode & Decode',
    short: 'URL Encoder',
    desc: 'Percent-encode or decode URLs and query strings, and break a full URL into its parameters as an editable table.',
    href: '/tools/url-encoder',
    icon: Link2,
    status: 'New',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    category: 'dev',
  },
  {
    id: 'uuid-generator',
    title: 'UUID Generator',
    desc: 'Generate UUID v4 and time-ordered v7 IDs in bulk using the browser\'s secure random source. Copy one or all.',
    href: '/tools/uuid-generator',
    icon: Fingerprint,
    status: 'New',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    category: 'dev',
  },
  {
    id: 'timestamp-converter',
    title: 'Unix Timestamp Converter',
    short: 'Timestamp Converter',
    desc: 'Convert Unix epoch seconds or milliseconds to readable dates in UTC and your local time zone, and back again.',
    href: '/tools/timestamp-converter',
    icon: CalendarClock,
    status: 'New',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    category: 'dev',
  },
  {
    id: 'sql-to-drizzle',
    title: 'SQL to Drizzle ORM Schema',
    short: 'SQL to Drizzle',
    desc: 'Convert PostgreSQL, MySQL or SQLite CREATE TABLE statements into a typed Drizzle ORM schema with references, composite keys and relations.',
    href: '/tools/sql-to-drizzle',
    icon: Droplets,
    status: 'New',
    color: 'text-lime-400',
    bg: 'bg-lime-500/10',
    category: 'data',
  },
];

// ─── NAVIGATION HELPERS ──────────────────────────────────────────────────────
// Order and short labels used by the explorer sidebar, homepage and footer.

export const CATEGORY_NAV: { key: ToolCategory; label: string }[] = [
  { key: 'json', label: 'JSON & Schema' },
  { key: 'dev',  label: 'Developer Utilities' },
  { key: 'data', label: 'Data Conversion' },
  { key: 'css',  label: 'CSS & Design' },
  { key: 'ai',   label: 'AI Tools' },
];

/**
 * Most-used tools first, ranked from Microsoft Clarity page visits
 * (100 days to 21 Oct 2026: Aurora 207, OpenAPI to Zod 147, SQL to Prisma 67,
 * Tailwind Shadow 47, TS to JSON Schema 39), then the newest tools.
 * Drives "Most used" on the homepage and the footer.
 */
export const FEATURED_TOOL_IDS = [
  'aurora-gradient',
  'openapi-to-zod',
  'sql-to-prisma',
  'tailwind-shadow-generator',
  'ts-to-json-schema',
  'mesh-gradient',
  'sql-to-drizzle',
  'json-formatter',
] as const;

export const toolsIn = (cat: ToolCategory) => TOOLS.filter((t) => t.category === cat);
export const toolById = (id: string) => TOOLS.find((t) => t.id === id);
export const shortName = (t: Tool) => t.short ?? t.title;

/**
 * Workflow chains: where a visitor usually goes next after each tool.
 * Rendered as "Next step" links under every tool to raise pages per session
 * (1.19 in Clarity, Oct 2026). Order matters: first = most likely next step.
 */
export const TOOL_CHAINS: Record<string, string[]> = {
  'sql-to-prisma': ['prisma-to-zod', 'sql-to-drizzle', 'sql-to-json'],
  'sql-to-drizzle': ['sql-to-prisma', 'sql-to-json', 'prisma-to-zod'],
  'sql-to-json': ['json-schema-to-zod', 'json-schema-to-ts', 'sql-to-drizzle'],
  'prisma-to-zod': ['zod-to-prompt', 'sql-to-prisma', 'ts-to-zod'],
  'openapi-to-zod': ['openapi-to-express', 'openapi-mock', 'zod-to-prompt'],
  'openapi-to-express': ['openapi-to-zod', 'openapi-mock', 'dockerfile-generator'],
  'openapi-mock': ['openapi-to-zod', 'openapi-to-express'],
  'trpc-to-openapi': ['openapi-to-zod', 'openapi-mock', 'openapi-to-express'],
  'graphql-to-trpc': ['trpc-to-openapi', 'graphql-to-zod'],
  'graphql-to-zod': ['graphql-to-trpc', 'zod-to-prompt'],
  'ts-to-zod': ['zod-to-prompt', 'ts-to-json-schema'],
  'ts-to-json-schema': ['json-schema-to-zod', 'json-schema-to-ts', 'ts-to-zod'],
  'json-schema-to-ts': ['json-schema-to-zod', 'ts-to-zod'],
  'json-schema-to-zod': ['zod-to-prompt', 'json-schema-to-ts'],
  'json-to-zod': ['zod-to-prompt', 'json-to-typescript', 'ai-mock-generator'],
  'json-formatter': ['json-to-typescript', 'json-to-zod'],
  'json-to-typescript': ['ts-to-zod', 'json-to-zod', 'ts-to-json-schema'],
  'pydantic-to-zod': ['zod-to-prompt', 'json-schema-to-zod'],
  'env-to-zod': ['dockerfile-generator', 'ts-to-zod'],
  'zod-to-prompt': ['ai-mock-generator', 'json-to-zod'],
  'ai-mock-generator': ['json-to-zod', 'json-formatter'],
  'aurora-gradient': ['mesh-gradient', 'glass-generator', 'tailwind-shadow-generator'],
  'mesh-gradient': ['aurora-gradient', 'glass-generator', 'tailwind-shadow-generator'],
  'glass-generator': ['tailwind-shadow-generator', 'aurora-gradient', 'mesh-gradient'],
  'tailwind-shadow-generator': ['glass-generator', 'aurora-gradient', 'tailwind-to-css'],
  'tailwind-to-css': ['tailwind-shadow-generator', 'glass-generator'],
  'jwt-debugger': ['base64', 'timestamp-converter'],
  'base64': ['jwt-debugger', 'url-encoder'],
  'url-encoder': ['base64', 'jwt-debugger'],
  'timestamp-converter': ['cron-descriptor', 'uuid-generator'],
  'cron-descriptor': ['timestamp-converter', 'dockerfile-generator'],
  'uuid-generator': ['timestamp-converter', 'ai-mock-generator'],
  'dockerfile-generator': ['env-to-zod', 'openapi-to-express'],
  'svg-to-jsx': ['meta-tag-generator', 'tailwind-to-css'],
  'meta-tag-generator': ['svg-to-jsx'],
  'diff-viewer': ['json-formatter', 'regex-tester'],
  'regex-tester': ['diff-viewer', 'cron-descriptor'],
};
export const nextTools = (id: string) =>
  (TOOL_CHAINS[id] ?? []).map(toolById).filter((t): t is Tool => Boolean(t));
