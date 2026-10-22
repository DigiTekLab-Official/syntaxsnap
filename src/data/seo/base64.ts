// src/data/seo/base64.ts
import type { ToolSEOContent } from './types';

export const base64Seo: ToolSEOContent = {
  faqs: [
    { question: "Is Base64 encryption?", answer: "No. Base64 is a reversible encoding that anyone can decode. Never use it to hide passwords or secrets." },
    { question: "Why does decoding fail?", answer: "Either the input contains characters outside the Base64 alphabet, or it decodes to binary data such as an image rather than readable text." },
    { question: "Is my data sent to a server?", answer: "No. Encoding and decoding run in your browser." },
    { question: "Can I decode a JWT here?", answer: "You can decode each part, but the JWT Debugger splits the token and shows the header, payload and expiry for you." }
  ],
  howTo: {
    name: "How to encode or decode Base64",
    steps: [
      { name: "Pick a direction", text: "Choose Encode to turn text into Base64, or Decode to turn Base64 back into text." },
      { name: "Paste your input", text: "Type or paste the text, Base64 string or data: URI." },
      { name: "Copy the result", text: "Copy the output, or use it as the next input to reverse the conversion." }
    ]
  }
};
