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
} from 'lucide-astro';

// ─── CATEGORY REGISTRY ───────────────────────────────────────────────────────
// Add new categories here — ToolCategory is derived automatically.

const CATEGORY_META = {
  json: { label: 'JSON & Schema' },
  css:  { label: 'CSS & Design' },
  dev:  { label: 'Developer Tools' },
  ai:   { label: 'AI-Powered' },
  data: { label: 'Data Conversion' },
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
}

// ─── TOOLS REGISTRY ──────────────────────────────────────────────────────────

export const TOOLS: Tool[] = [
  {
    id: 'ai-mock-generator',
    title: 'AI Mock Generator',
    desc: 'Generate realistic mock data from natural language prompts. Runs entirely in your browser — no API keys required, no data leaves your machine.',
    href: '/tools/ai-mock-generator',
    icon: Sparkles,
    status: 'New',
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
    status: 'New',
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
    status: 'Popular',
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
    title: 'Cron Descriptor',
    desc: 'Translate cron expressions into plain English descriptions and preview upcoming scheduled run times. Offline-first processing with zero telemetry.',
    href: '/tools/cron-descriptor',
    icon: Clock,
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
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
    status: 'New',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    category: 'dev',
  },
  
];