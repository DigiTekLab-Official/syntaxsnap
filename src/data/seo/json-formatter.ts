// src/data/seo/json-formatter.ts
import type { ToolSEOContent } from './types';

export const jsonFormatterSeo: ToolSEOContent = {
  faqs: [
    { question: "Is my JSON sent to a server?", answer: "No. Formatting uses your browser's built-in JSON parser, and files over 1 MB are handled by a Web Worker in the same tab. You can confirm it in the network tab of your browser's developer tools: formatting makes no requests." },
    { question: "How big a file can it format?", answer: "You can open files up to 50 MB. Anything over 1 MB is parsed in the background so the editor keeps responding. The output pane shows the first 400 KB of very large results, and Copy and Download always give you the full text." },
    { question: "Why did a long number change after formatting?", answer: "JSON numbers are read as 64-bit floating point, which is exact only up to 9,007,199,254,740,991. A value like 12345678901234567890 comes back as 12345678901234567000. If you work with 64-bit IDs, store them as strings in your JSON." },
    { question: "Why did the key order change?", answer: "It only changes for keys that look like whole numbers, such as \"2\" or \"10\". JavaScript lists those keys first, in numeric order, before all other keys. Text keys keep the order you wrote them in unless you tick Sort keys." },
    { question: "Can it fix JSON returned by ChatGPT or Claude?", answer: "Usually. Fix common errors removes markdown code fences and surrounding sentences, strips comments, removes trailing commas, adds missing commas, converts single quotes, quotes bare keys and turns True, False and None into JSON literals. It only offers the fix when the result is valid JSON." },
  ],
  howTo: {
    name: "How to format JSON",
    steps: [
      { name: "Add your JSON", text: "Paste it, drop a .json file on the input panel, open a file, or load a URL with your browser." },
      { name: "Pick a style", text: "Choose Beautify with 2 spaces, 4 spaces or tabs, or Minify. Tick Sort keys for stable, diff-friendly output." },
      { name: "Copy, download or send it on", text: "Copy the result, download formatted.json, or send it to JSON to TypeScript, Zod or CSV." },
    ],
  },
};
