# SyntaxSnap

Offline-first developer tools built with Astro, React, and Tailwind v4.

SyntaxSnap is a collection of **48 small, fast browser tools** for everyday developer tasks: converting schemas and types, working with JSON, generating config and boilerplate, and debugging common formats. Tools run in your browser, so your code and data stay on your device.

**Live site:** https://syntaxsnap.com

## Tools

### Database to schema
- **SQL to Prisma**: turn SQL into a Prisma schema
- **SQL to Drizzle**: turn SQL into Drizzle ORM tables
- **SQL to JSON**: convert SQL definitions to JSON
- **Prisma to Zod**: generate Zod schemas from Prisma models

### Types and validation schemas
- **TypeScript to Zod**
- **TypeScript to JSON Schema**
- **JSON Schema to TypeScript**
- **JSON Schema to Zod**
- **JSON to Zod**
- **JSON to TypeScript**
- **Pydantic to Zod**
- **Env to Zod**: build a validated environment schema
- **Zod to Prompt**: turn a Zod schema into an LLM prompt

### API tooling
- **OpenAPI to Zod**
- **OpenAPI to Express**
- **OpenAPI Mock**
- **tRPC to OpenAPI**
- **GraphQL to tRPC**
- **GraphQL to Zod**

### JSON and data formats
- **JSON Formatter**, **JSON Viewer**, **JSON Validator**
- **JSON Minify**, **JSON Escape**, **JSON Compare**
- **JSON to CSV** and **CSV to JSON**
- **JSON to YAML** and **YAML to JSON**
- **JSON to XML** and **XML to JSON**

### Encoding and debugging
- **JWT Debugger**
- **Base64** and **URL Encoder**
- **Timestamp Converter**
- **Cron Descriptor**
- **UUID Generator**
- **Regex Tester**
- **Diff Viewer**

### CSS and design
- **Aurora Gradient** and **Mesh Gradient**
- **Glass Generator** (glassmorphism CSS)
- **Tailwind Shadow Generator**
- **Tailwind to CSS**

### Generators
- **Dockerfile Generator**
- **SVG to JSX**
- **Meta Tag Generator**
- **AI Mock Generator**: generate realistic mock data

Related tools are cross-linked, so you can move from one conversion to the next without starting over.

There is also a **browser extension** (see `extension/`) that hands content from any page to the matching tool via a URL fragment.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Astro](https://astro.build) |
| UI | React, Tailwind CSS v4 |
| Language | TypeScript |
| Testing | Playwright (end-to-end) |
| Package manager | pnpm |
| Hosting | Cloudflare |

## Getting started

### Prerequisites

- Node.js (current LTS)
- [pnpm](https://pnpm.io)

### Run locally

```bash
git clone https://github.com/DigiTekLab-Official/syntaxsnap.git
cd syntaxsnap
pnpm install
cp .env.example .env   # then fill in any values you need
pnpm dev
```

The dev server starts at `http://localhost:4321`.

### Build

```bash
pnpm build
pnpm preview
```

### Tests

```bash
pnpm exec playwright install   # first time only
pnpm exec playwright test
```

## Project structure

```text
.
├── src/          # Astro pages, React components, tool logic
├── public/       # Static assets
├── extension/    # Browser extension source
├── e2e/          # Playwright end-to-end tests
├── scripts/      # Build and maintenance scripts
└── .github/      # CI workflows
```

## Contributing

Contributions are welcome.

1. Open an issue to report a bug or suggest a tool.
2. Fork the repo and create a branch.
3. Make your change and add or update tests where it makes sense.
4. Open a pull request describing what changed and why.

Please keep tools offline-first: user input should not be sent to a server.

## License

Released under the [MIT License](./LICENSE).