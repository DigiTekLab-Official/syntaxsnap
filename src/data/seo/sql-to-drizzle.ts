// src/data/seo/sql-to-drizzle.ts
import type { ToolSEOContent } from './types';

export const sqlToDrizzleSeo: ToolSEOContent = {
  faqs: [
    { question: "Is my database schema uploaded?", answer: "No. Parsing and code generation run in your browser, so table and column names never leave your device." },
    { question: "Which Drizzle version is the output for?", answer: "It uses the current API, where extra table config such as composite keys is returned as an array from the third argument of pgTable, mysqlTable or sqliteTable." },
    { question: "Does it generate drizzle-kit migrations?", answer: "No. It writes the schema file. Run drizzle-kit pull against a live database if you want Drizzle to introspect it, or drizzle-kit generate after adding this schema to create migrations." },
    { question: "Are indexes converted?", answer: "Not yet. Add them in the table's third argument with index().on(...) after converting." },
    { question: "Can I convert a Prisma schema to Drizzle?", answer: "Not directly. Generate SQL from Prisma with prisma migrate diff, then paste that SQL here." }
  ],
  howTo: {
    name: "How to convert SQL to a Drizzle schema",
    steps: [
      { name: "Paste your CREATE TABLE statements", text: "Paste one or more statements. The database is detected from the syntax, or you can pick it." },
      { name: "Review the notes", text: "Read any notes about unmapped types or references to tables that are missing from the input." },
      { name: "Copy schema.ts", text: "Copy the schema or download it as schema.ts and add it to your Drizzle config." }
    ]
  }
};
