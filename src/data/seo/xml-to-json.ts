// src/data/seo/xml-to-json.ts
import type { ToolSEOContent } from './types';

export const xmlToJsonSeo: ToolSEOContent = {
  faqs: [
    { question: "Why is one element an object and another an array?", answer: "An element that appears once becomes a single value, and one that repeats becomes an array. So a feed with one <item> gives an object where a feed with two gives an array. Check for both shapes in code that reads the JSON." },
    { question: "Where do attributes go?", answer: "Into the element's object, with the attribute prefix in front of the name: <price currency=\"USD\"> gives \"@_currency\": \"USD\". Set the prefix to @ or leave it empty, or tick Drop attributes to ignore them." },
    { question: "What is the #text key?", answer: "When an element has both attributes and text, the text goes under #text. <price currency=\"USD\">44.95</price> becomes {\"#text\": 44.95, \"@_currency\": \"USD\"}." },
    { question: "Does it validate against a DTD or XSD?", answer: "No. It checks that the XML is well-formed: tags match and close, attributes are quoted and not repeated. It does not check the document against a schema." },
    { question: "Is the XML uploaded?", answer: "No. It is parsed with fast-xml-parser inside your browser, in a Web Worker for files over 1 MB." },
  ],
  howTo: {
    name: "How to convert XML to JSON",
    steps: [
      { name: "Paste the XML", text: "Paste it or drop an .xml, .rss or .svg file." },
      { name: "Choose how attributes look", text: "Set the attribute prefix, drop attributes, and choose whether numbers and booleans are parsed." },
      { name: "Copy the JSON", text: "Copy it, download data.json, or send it to JSON to TypeScript." },
    ],
  },
};
