// src/data/seo/csv-to-json.ts
import type { ToolSEOContent } from './types';

export const csvToJsonSeo: ToolSEOContent = {
  faqs: [
    { question: "Can I convert an Excel file?", answer: "Save the sheet as CSV first (File, Save As, CSV UTF-8), then open that file here. The converter reads text formats only: CSV, TSV and other delimited text." },
    { question: "Why did my ZIP codes stay as text?", answer: "Values with leading zeros, such as 01067 or 007, keep their zeros only as strings, so type inference leaves them alone. Whole numbers too large to store exactly, like long IDs, also stay strings." },
    { question: "Does it handle semicolon CSV from European Excel?", answer: "Yes. Auto detection checks commas, semicolons, tabs and pipes and picks the one that splits the rows consistently. The footer shows which one it used, and you can choose one yourself." },
    { question: "What if a cell contains the delimiter or a line break?", answer: "Quoted cells are read the standard way (RFC 4180): delimiters and line breaks inside double quotes stay part of the value, and a doubled quote (\"\") becomes one quote character." },
    { question: "Is my CSV uploaded?", answer: "No. The file is read with your browser's FileReader and converted in the page. Large files are processed in a Web Worker on your device." },
  ],
  howTo: {
    name: "How to convert CSV to JSON",
    steps: [
      { name: "Add the CSV", text: "Paste it or drop a .csv or .tsv file. The delimiter is detected for you." },
      { name: "Set the options", text: "Keep First row is header for an array of objects, and Infer types for real numbers and booleans." },
      { name: "Use the JSON", text: "Copy or download data.json, or send it to the JSON formatter or JSON to TypeScript." },
    ],
  },
};
