// src/data/seo/json-to-yaml.ts
import type { ToolSEOContent } from './types';

export const jsonToYamlSeo: ToolSEOContent = {
  faqs: [
    { question: "Is JSON already valid YAML?", answer: "Almost always. YAML 1.2 was designed so that JSON documents are valid YAML. Converting still helps because block-style YAML is easier to read and edit, and it is what Kubernetes, Docker Compose and CI tools expect in their docs." },
    { question: "Why are some values in quotes?", answer: "Strings that YAML could read as something else are quoted so they stay strings: yes, no, on and off (booleans in YAML 1.1), numbers such as \"4\", dates such as \"2026-10-22\", and text containing a colon followed by a space." },
    { question: "Does it create anchors and aliases?", answer: "No. Repeated objects are written out in full every time, which is what most tools expect. Add anchors by hand afterwards if you want to deduplicate." },
    { question: "Can it read JSON with comments?", answer: "Yes. Comments and trailing commas in the input are accepted, but they are not carried over, because the converter works from the parsed data. Add YAML # comments after converting." },
    { question: "Can I convert the YAML back to JSON?", answer: "Yes. Use Send to, then YAML to JSON, and you get the same data back." },
  ],
  howTo: {
    name: "How to convert JSON to YAML",
    steps: [
      { name: "Paste the JSON", text: "Paste it, drop a file, or load a URL. Comments and trailing commas are accepted." },
      { name: "Choose the indent", text: "Pick 2 or 4 spaces and, if you like, sort the keys alphabetically." },
      { name: "Copy the YAML", text: "Copy it or download data.yaml." },
    ],
  },
};
