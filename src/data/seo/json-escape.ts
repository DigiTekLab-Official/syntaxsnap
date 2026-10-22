// src/data/seo/json-escape.ts
import type { ToolSEOContent } from './types';

export const jsonEscapeSeo: ToolSEOContent = {
  faqs: [
    { question: "What is the difference between escaping and JSON.stringify?", answer: "None for text: escaping a string gives the same result as JSON.stringify(text) in JavaScript. With Minify JSON first on, valid JSON input is minified before it is escaped, which is what JSON.stringify(JSON.stringify(data)) gives you." },
    { question: "Why are backslashes doubled?", answer: "A backslash starts an escape sequence in JSON, so a literal backslash has to be written as \\\\. That is why a Windows path like C:\\Users becomes C:\\\\Users." },
    { question: "Are accented letters and emoji escaped?", answer: "No. JSON allows any Unicode character inside strings, so é and 👍 are kept as they are. Only quotes, backslashes and control characters such as line breaks and tabs must be escaped." },
    { question: "How do I unescape a double-escaped string?", answer: "Unescape it once, then click Use as input and unescape the result again. Each pass removes one layer of escaping." },
    { question: "Is my text sent anywhere?", answer: "No. Escaping and unescaping happen in your browser. Nothing is uploaded or logged." },
  ],
  howTo: {
    name: "How to escape or unescape a JSON string",
    steps: [
      { name: "Choose a direction", text: "Pick Escape to make a JSON string literal, or Unescape to turn one back into text." },
      { name: "Paste the input", text: "Paste text or JSON to escape, or an escaped string, with or without its outer quotes, to unescape." },
      { name: "Copy the result", text: "Copy the output, or click Use as input to run it through again." },
    ],
  },
};
