// src/data/seo/json-validator.ts
import type { ToolSEOContent } from './types';

export const jsonValidatorSeo: ToolSEOContent = {
  faqs: [
    { question: "Is this the same as JSONLint?", answer: "It does the same job: it checks your text against the JSON standard (RFC 8259) and tells you where it breaks. It also keeps going after recoverable problems, so you see every missing comma or stray quote in one pass instead of fixing them one at a time." },
    { question: "Does it validate against a JSON Schema?", answer: "No. This page checks that the text is well-formed JSON. To check that the data has the right fields and types, generate a schema with JSON to Zod or convert an existing JSON Schema with JSON Schema to Zod." },
    { question: "Why is a duplicate key only a warning?", answer: "The standard says object keys should be unique but does not forbid repeats, so JSON.parse accepts them and keeps only the last value. That silently drops data, which is why the validator points each one out." },
    { question: "What does 'Unexpected text after the JSON value' mean?", answer: "The input holds more than one JSON value, usually because several objects were pasted one after another, as in JSON Lines (NDJSON) logs. Wrap them in [ ] with commas between them, or click Fix common errors to do that for you." },
    { question: "Is my data sent anywhere?", answer: "No. The validator runs in your browser tab. Large inputs are checked in a Web Worker on your device, and nothing is uploaded or stored." },
  ],
  howTo: {
    name: "How to validate JSON",
    steps: [
      { name: "Paste or open the JSON", text: "Paste it, drop a file, or load it from a URL with your browser. It is checked as you type." },
      { name: "Read the result", text: "A green banner means valid JSON. A red one lists every problem with its line and column." },
      { name: "Fix the problems", text: "Click a line number to jump to it, or use Fix common errors for commas, quotes, comments and literals." },
    ],
  },
};
