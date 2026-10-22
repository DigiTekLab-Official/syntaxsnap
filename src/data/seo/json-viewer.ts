// src/data/seo/json-viewer.ts
import type { ToolSEOContent } from './types';

export const jsonViewerSeo: ToolSEOContent = {
  faqs: [
    { question: "How do I get the path to a value?", answer: "Click the node in the tree. Its JSONPath, such as $.releases[0].assets[1].name, is copied to your clipboard and shown at the bottom of the panel. Keys that are not plain identifiers use bracket notation, for example $['content-type']." },
    { question: "Can I search inside the JSON?", answer: "Yes. The search box matches keys and values without regard to case, opens every parent of each match, and highlights it. Press Enter for the next match and Shift+Enter for the previous one." },
    { question: "Does the viewer change my JSON?", answer: "No. The tree is built from a parsed copy of your input and nothing is rewritten. Switch to Code view if you want a formatted or minified version to copy." },
    { question: "How large a document can I explore?", answer: "Files up to 50 MB open. Only the rows on screen are drawn and a node's children are created when you expand it, so large arrays stay smooth. Expand all stops after 20,000 containers; use search to reach deeper nodes." },
    { question: "Can I view JSON Lines (NDJSON)?", answer: "Several JSON documents one after another are not a single JSON value, so the viewer reports them as an error. Click Fix common errors to wrap them in an array, then browse them as one tree." },
  ],
  howTo: {
    name: "How to view JSON as a tree",
    steps: [
      { name: "Load the JSON", text: "Paste it, drop a file on the input panel, or fetch a URL from your browser." },
      { name: "Explore the tree", text: "The first two levels open automatically. Expand nodes, or search for a key or value to jump straight to it." },
      { name: "Copy what you need", text: "Click any node to copy its JSONPath, or switch to Code view to copy formatted JSON." },
    ],
  },
};
