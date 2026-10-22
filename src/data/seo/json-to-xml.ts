// src/data/seo/json-to-xml.ts
import type { ToolSEOContent } from './types';

export const jsonToXmlSeo: ToolSEOContent = {
  faqs: [
    { question: "How do I make an XML attribute?", answer: "Start the key with the attribute prefix, which is @_ by default. {\"book\": {\"@_id\": \"bk101\", \"title\": \"Dune\"}} becomes <book id=\"bk101\"><title>Dune</title></book>. Change the prefix in the toolbar if your data uses @ or something else." },
    { question: "How are arrays converted?", answer: "An array becomes the same element repeated once per item, so \"tag\": [\"a\", \"b\"] becomes <tag>a</tag><tag>b</tag>. A top-level array, or an array inside an array, uses the Array item name, item by default." },
    { question: "Why was one of my keys renamed?", answer: "XML element names cannot contain spaces or most punctuation, and cannot start with a digit or with \"xml\". Such keys are changed, for example \"first name\" to first_name, and a note lists every renamed key." },
    { question: "What is the root element?", answer: "XML needs exactly one top-level element. The converter wraps your data in the root element you name. Leave the name empty and, if your JSON is an object with a single key, that key becomes the root." },
    { question: "Are special characters escaped?", answer: "Yes. &, < and > in text are written as &amp;, &lt; and &gt;, so the output is always well-formed XML." },
  ],
  howTo: {
    name: "How to convert JSON to XML",
    steps: [
      { name: "Paste the JSON", text: "Paste it, drop a file, or load a URL with your browser." },
      { name: "Name the root", text: "Set the root element and array item names and the attribute prefix." },
      { name: "Copy the XML", text: "Copy it or download data.xml, with or without the XML declaration." },
    ],
  },
};
