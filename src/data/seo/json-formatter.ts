// src/data/seo/json-formatter.ts
import type { ToolSEOContent } from './types';

export const jsonFormatterSeo: ToolSEOContent = {
  faqs: [
    { question: "Is my JSON sent to a server?", answer: "No. Formatting and validation use your browser's built-in JSON parser. Nothing you paste leaves the page." },
    { question: "How big a file can it handle?", answer: "Files of several megabytes format comfortably on a modern laptop. Very large files may make the page slow while they are processed, since the work happens on your device." },
    { question: "What is the difference between beautify and minify?", answer: "Beautify adds line breaks and indentation so people can read the JSON. Minify removes all optional whitespace so the payload is as small as possible for sending over a network." },
    { question: "Why does the error point to the wrong line?", answer: "The parser reports where it stopped understanding the text. The actual mistake, such as a missing comma, is often on the line before." },
    { question: "Can it fix JSON returned by ChatGPT or Claude?", answer: "Often, yes. Fix common errors strips code fences, comments and trailing commas and converts single quotes and bare keys, which covers most malformed LLM output." }
  ],
  howTo: {
    name: "How to format and validate JSON",
    steps: [
      { name: "Paste your JSON", text: "Paste or type JSON into the input panel. It is validated as you type." },
      { name: "Choose a layout", text: "Pick Beautify or Minify, an indent size, and whether to sort keys." },
      { name: "Copy or download", text: "Copy the result or download it as formatted.json." }
    ]
  }
};
