// src/data/seo/json-to-zod.ts
import type { ToolSEOContent } from './types';

export const jsonToZodSeo: ToolSEOContent = {
  faqs: [
    {
      question: "Is my JSON data sent to a server?",
      answer: "No. SyntaxSnap processes all data locally in your browser. Your sensitive JSON never leaves your device."
    },
    {
      question: "What is Zod?",
      answer: "Zod is a TypeScript-first schema declaration and validation library. It allows you to create schemas that validate data at runtime."
    },
    {
      question: "Does this support nested arrays?",
      answer: "Yes, the tool recursively analyzes nested objects and arrays to generate a complete schema structure."
    },
    {
      question: "How does the JSON to Zod converter handle nested objects?",
      answer: "The tool recursively analyzes your JSON structure to generate nested 'z.object()' and 'z.array()' definitions, ensuring full TypeScript type safety for complex API responses."
    },
    {
      question: "Can I use this for runtime schema validation?",
      answer: "Absolutely. This tool generates standard Zod schemas that allow you to validate external data at runtime, preventing 'any' types from polluting your TypeScript codebase."
    }
  ],
  howTo: {
    name: "How to convert JSON to a Zod Schema",
    steps: [
      { 
        name: "Paste JSON", 
        text: "Paste your valid JSON object or array into the left editor panel." 
      },
      { 
        name: "Format", 
        text: "The tool will automatically analyze the data types, handling nulls, arrays, and nested objects." 
      },
      { 
        name: "Copy Schema", 
        text: "Click the copy button on the right panel to grab your ready-to-use TypeScript Zod schema." 
      }
    ]
  }
};