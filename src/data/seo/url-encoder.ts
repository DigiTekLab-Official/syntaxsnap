// src/data/seo/url-encoder.ts
import type { ToolSEOContent } from './types';

export const urlEncoderSeo: ToolSEOContent = {
  faqs: [
    { question: "What is percent-encoding?", answer: "It replaces characters that are not allowed in URLs with a % followed by two hex digits, so a space becomes %20 and \u00e9 becomes %C3%A9." },
    { question: "Which encoding should I use for API parameters?", answer: "Query value. It escapes characters such as & and = that would otherwise split the parameter." },
    { question: "Is anything uploaded?", answer: "No. Encoding, decoding and parsing all run in your browser." }
  ],
  howTo: {
    name: "How to encode or decode a URL",
    steps: [
      { name: "Choose a direction", text: "Pick Encode or Decode. For encoding, choose Query value or Full URL." },
      { name: "Paste your text", text: "Paste the URL or value. The result updates as you type." },
      { name: "Copy the result", text: "Copy the output, and check the URL parts table for each parameter." }
    ]
  }
};
