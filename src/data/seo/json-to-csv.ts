// src/data/seo/json-to-csv.ts
import type { ToolSEOContent } from './types';

export const jsonToCsvSeo: ToolSEOContent = {
  faqs: [
    { question: "How do I open the CSV in Excel?", answer: "Tick Excel-friendly download, then download data.csv and open it. That adds a UTF-8 byte order mark so names like Müller or São Paulo show correctly. If your Excel uses a comma as the decimal separator, as in Germany or France, choose the semicolon delimiter." },
    { question: "What happens to nested objects?", answer: "With Flatten nested objects on, each nested field gets its own column named by its path, such as address.city. With it off, the whole nested object is written into one cell as JSON text." },
    { question: "How are arrays converted?", answer: "Choose a; b to join simple arrays into one cell, Columns to give each item its own column (tags.0, tags.1), or JSON to keep the array as JSON text. Arrays of objects always become columns or JSON." },
    { question: "Why are some cells empty?", answer: "The columns are every key found in any record. When a record does not have one of those keys, its cell is left empty, and a note above the output says how many rows were missing columns." },
    { question: "My JSON is an object, not an array. Will it work?", answer: "Yes. If the object has one property that holds a list of records, such as {\"data\": [...]}, that list is used. Any other object becomes a single row." },
  ],
  howTo: {
    name: "How to convert JSON to CSV",
    steps: [
      { name: "Add the JSON", text: "Paste an array of objects, drop a .json file, or load a URL with your browser." },
      { name: "Check the table", text: "Preview the rows and columns, then adjust flattening, array handling and the delimiter." },
      { name: "Download the CSV", text: "Download data.csv, ticking Excel-friendly download if you will open it in Excel." },
    ],
  },
};
