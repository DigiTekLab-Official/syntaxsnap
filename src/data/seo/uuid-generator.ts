// src/data/seo/uuid-generator.ts
import type { ToolSEOContent } from './types';

export const uuidGeneratorSeo: ToolSEOContent = {
  faqs: [
    { question: "Are these UUIDs unique?", answer: "For practical purposes, yes. They use a cryptographically secure random source, so collisions are vanishingly unlikely." },
    { question: "Are the IDs generated on a server?", answer: "No. They are generated in your browser and never sent anywhere." },
    { question: "What is the difference between a UUID and a GUID?", answer: "They are the same thing. GUID is the name Microsoft uses for UUIDs." }
  ],
  howTo: {
    name: "How to generate UUIDs",
    steps: [
      { name: "Choose a version", text: "Pick v4 for random IDs or v7 for time-ordered IDs." },
      { name: "Set the count and format", text: "Choose how many, and whether you want uppercase or no hyphens." },
      { name: "Copy or download", text: "Copy a single ID, copy all of them, or download uuids.txt." }
    ]
  }
};
