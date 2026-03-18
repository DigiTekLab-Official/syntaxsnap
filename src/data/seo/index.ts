// src/data/seo/index.ts
import type { ToolSEOContent } from './types';

// 1. Import all your individual tool data files
import { jsonToZodSeo } from './json-to-zod';
import { jwtDebuggerSeo } from './jwt-debugger';

// 2. Export them as a single dictionary mapped to their URL slugs
export const toolSeoData: Record<string, ToolSEOContent> = {
  "json-to-zod": jsonToZodSeo,
  "jwt-debugger": jwtDebuggerSeo,
  // Just add one line here whenever you launch a new tool!
};