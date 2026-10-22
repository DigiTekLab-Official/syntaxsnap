// src/data/seo/timestamp-converter.ts
import type { ToolSEOContent } from './types';

export const timestampConverterSeo: ToolSEOContent = {
  faqs: [
    { question: "What is a Unix timestamp?", answer: "The number of seconds since 00:00:00 UTC on 1 January 1970, not counting leap seconds." },
    { question: "How do I tell seconds from milliseconds?", answer: "Current timestamps in seconds have 10 digits; in milliseconds they have 13. The converter detects this automatically." },
    { question: "What happens in 2038?", answer: "Systems that store Unix time as a signed 32-bit integer overflow on 19 January 2038. JavaScript uses 64-bit numbers, so this tool is not affected." }
  ],
  howTo: {
    name: "How to convert a Unix timestamp",
    steps: [
      { name: "Paste a timestamp or date", text: "Enter epoch seconds, milliseconds or a date string." },
      { name: "Read the conversions", text: "See the same moment in UTC, local time, ISO 8601 and relative time." },
      { name: "Copy the format you need", text: "Copy any row, or copy the current Unix time." }
    ]
  }
};
