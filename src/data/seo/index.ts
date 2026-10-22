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
import { jsonViewerSeo } from './json-viewer';
import { jsonValidatorSeo } from './json-validator';
import { jsonMinifySeo } from './json-minify';
import { jsonToCsvSeo } from './json-to-csv';
import { csvToJsonSeo } from './csv-to-json';
import { jsonToYamlSeo } from './json-to-yaml';
import { yamlToJsonSeo } from './yaml-to-json';
import { jsonToXmlSeo } from './json-to-xml';
import { xmlToJsonSeo } from './xml-to-json';
import { jsonCompareSeo } from './json-compare';
import { jsonEscapeSeo } from './json-escape';

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
  "json-viewer": jsonViewerSeo,
  "json-validator": jsonValidatorSeo,
  "json-minify": jsonMinifySeo,
  "json-to-csv": jsonToCsvSeo,
  "csv-to-json": csvToJsonSeo,
  "json-to-yaml": jsonToYamlSeo,
  "yaml-to-json": yamlToJsonSeo,
  "json-to-xml": jsonToXmlSeo,
  "xml-to-json": xmlToJsonSeo,
  "json-compare": jsonCompareSeo,
  "json-escape": jsonEscapeSeo,
  // Just add one line here whenever you launch a new tool!
};