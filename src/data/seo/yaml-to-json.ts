// src/data/seo/yaml-to-json.ts
import type { ToolSEOContent } from './types';

export const yamlToJsonSeo: ToolSEOContent = {
  faqs: [
    { question: "Why did on: not become true?", answer: "This converter follows YAML 1.2, where only true and false are booleans. In older YAML 1.1 parsers, yes, no, on and off are booleans too, which is why a GitHub Actions on: key can turn into true elsewhere. Here it stays the string \"on\"." },
    { question: "What happens to dates?", answer: "They stay strings exactly as written, so 2026-10-22 becomes \"2026-10-22\". JSON has no date type, and keeping the text avoids time zone surprises." },
    { question: "Does it support anchors, aliases and merge keys?", answer: "Yes. &anchors, *aliases and <<: merge keys are expanded, so the JSON contains the full values." },
    { question: "What if the file has several documents?", answer: "Documents separated by --- become items of a JSON array, in order. A single document becomes a single JSON value." },
    { question: "Is the YAML uploaded?", answer: "No. It is parsed by js-yaml in your browser. Nothing is sent or stored." },
  ],
  howTo: {
    name: "How to convert YAML to JSON",
    steps: [
      { name: "Paste the YAML", text: "Paste it or drop a .yaml or .yml file." },
      { name: "Fix any errors", text: "Errors explain the problem in plain words and highlight the line in the input." },
      { name: "Copy the JSON", text: "Copy it, download data.json, or send it to JSON to TypeScript." },
    ],
  },
};
