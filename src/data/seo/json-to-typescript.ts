// src/data/seo/json-to-typescript.ts
import type { ToolSEOContent } from './types';

export const jsonToTypescriptSeo: ToolSEOContent = {
  faqs: [
    { question: "Is my JSON uploaded anywhere?", answer: "No. The conversion runs in your browser and nothing is sent to a server." },
    { question: "Should I use interface or type?", answer: "Both work for object shapes. Interfaces can be extended and merged; type aliases can express unions. Many teams pick one for consistency, and the output switches with one click." },
    { question: "How are arrays with mixed items handled?", answer: "Objects in the same array are merged into one type. Primitive values of different kinds become a union, such as (string | number)[]." },
    { question: "Can I generate Zod schemas instead?", answer: "Yes. Use the JSON to Zod tool for a runtime schema, then use z.infer to get the TypeScript type from it." }
  ],
  howTo: {
    name: "How to convert JSON to TypeScript",
    steps: [
      { name: "Paste a JSON sample", text: "Paste a real response from your API. More varied samples give more accurate types." },
      { name: "Set the options", text: "Name the root type and choose interface or type, export and readonly." },
      { name: "Copy the types", text: "Copy the result into your project or download types.ts." }
    ]
  }
};
