// src/data/seo/index.ts
import type { ToolSEOContent } from './types';

// 1. Import all your individual tool data files
import { jsonToZodSeo } from './json-to-zod';
import { jwtDebuggerSeo } from './jwt-debugger';
import { jsonFormatterSeo } from './json-formatter';
import { jsonToTypescriptSeo } from './json-to-typescript';
import { base64Seo } from './base64';
import { urlEncoderSeo } from './url-encoder';
import { uuidGeneratorSeo } from './uuid-generator';
import { timestampConverterSeo } from './timestamp-converter';
import { sqlToDrizzleSeo } from './sql-to-drizzle';

// 2. Export them as a single dictionary mapped to their URL slugs
export const toolSeoData: Record<string, ToolSEOContent> = {
  "json-to-zod": jsonToZodSeo,
  "jwt-debugger": jwtDebuggerSeo,
  "json-formatter": jsonFormatterSeo,
  "json-to-typescript": jsonToTypescriptSeo,
  "base64": base64Seo,
  "url-encoder": urlEncoderSeo,
  "uuid-generator": uuidGeneratorSeo,
  "timestamp-converter": timestampConverterSeo,
  "sql-to-drizzle": sqlToDrizzleSeo,
  // Just add one line here whenever you launch a new tool!
};