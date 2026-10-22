// src/data/seo/json-compare.ts
import type { ToolSEOContent } from './types';

export const jsonCompareSeo: ToolSEOContent = {
  faqs: [
    { question: "Does key order matter?", answer: "No. Both documents are parsed and compared by value, so {\"a\": 1, \"b\": 2} and {\"b\": 2, \"a\": 1} are equal. Whitespace and indentation are ignored too." },
    { question: "Can I compare arrays regardless of order?", answer: "Yes. Tick Ignore array order and items are matched by value wherever they appear. Leave it off for lists where position matters, such as steps or rankings." },
    { question: "What counts as changed?", answer: "A path whose value is different on each side, including a change of type, such as \"42\" becoming 42. Keys present on only one side are listed as added or removed." },
    { question: "Can I compare JSON with comments?", answer: "Yes. Comments, trailing commas and single quotes are accepted on both sides, so you can compare JSONC config files such as tsconfig.json directly." },
    { question: "Are my files uploaded?", answer: "No. Both documents are parsed and compared inside your browser. Nothing leaves the page." },
  ],
  howTo: {
    name: "How to compare two JSON documents",
    steps: [
      { name: "Add both versions", text: "Paste or drop the original on the left and the changed version on the right." },
      { name: "Read the changes", text: "Each added, removed or changed path is listed with its value before and after." },
      { name: "Export the result", text: "Copy or download the list of changes as JSON, or switch to the text view." },
    ],
  },
};
