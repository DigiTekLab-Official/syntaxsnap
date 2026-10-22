// src/data/seo/json-minify.ts
import type { ToolSEOContent } from './types';

export const jsonMinifySeo: ToolSEOContent = {
  faqs: [
    { question: "Does minifying change my data?", answer: "No. Only whitespace between tokens is removed. Strings, including any spaces inside them, keys, numbers and the order of keys stay as they were. Parsing the minified output gives exactly the same value." },
    { question: "How is the saving calculated?", answer: "It compares the UTF-8 size of your input with the size of the minified output, in bytes, and shows the difference as a number and a percentage of the input." },
    { question: "Can I minify JSON that has comments?", answer: "Yes. Tick Allow comments (JSONC) and the comments and trailing commas are dropped, which also turns a JSONC config into strict JSON." },
    { question: "Is there any point minifying if my server uses gzip?", answer: "Compression removes most of the cost of whitespace on the wire, but minified JSON is still smaller in memory, in storage, in browser localStorage, in log lines and anywhere the payload is not compressed, such as environment variables." },
    { question: "Is minified JSON still valid JSON?", answer: "Yes. Whitespace between tokens is optional in JSON, so the minified version is just as valid and any parser reads it the same way." },
  ],
  howTo: {
    name: "How to minify JSON",
    steps: [
      { name: "Paste or open the JSON", text: "Paste it, drop a file, or load a URL. Minify is already selected." },
      { name: "Check the saving", text: "The output footer shows the new size and how many bytes and what percentage you saved." },
      { name: "Copy or download", text: "Copy the single-line JSON or download minified.json." },
    ],
  },
};
