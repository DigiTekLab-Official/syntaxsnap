# Contributing to SyntaxSnap

Thanks for your interest in SyntaxSnap. This is a small project, and help is welcome: bug fixes, new tools, accessibility fixes, tests, docs and tidy-ups all count.

## The one rule that matters

**Tools run in the browser, and user input must never be sent to a server.** That is the whole point of SyntaxSnap. Pull requests that add network calls with user data will not be merged. The AI Mock Generator is the only tool that talks to an external service, and it says so in its interface.

## Where to start

- Look for issues labelled [`good first issue`](../../labels/good%20first%20issue). They are small, self-contained and describe what "done" looks like.
- Issues labelled [`help wanted`](../../labels/help%20wanted) are bigger but still well defined.
- Found a bug or want a new tool? Open an issue first for anything larger than a small fix, so we can agree on the approach before you spend time on it.

## Setup

You need Node.js (current LTS) and [pnpm](https://pnpm.io).

```bash
git clone https://github.com/DigiTekLab-Official/syntaxsnap.git
cd syntaxsnap
pnpm install
cp .env.example .env   # fill in values only if the feature you work on needs them
pnpm dev               # http://localhost:4321
```

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 4321 |
| `pnpm build` | Production build into `dist/` |
| `pnpm lint` | ESLint over `src/` |
| `pnpm exec playwright test --project=chromium` | End-to-end tests (Chromium) |

`pnpm preview` is not supported, because the Cloudflare adapter does not provide a local preview server. Tests start their own dev server through `playwright.config.ts`.

## Project layout

```text
src/components/tools/   one React component per tool
src/components/ui/      shared UI (editor, tree view, copy button, ...)
src/config/tools.ts     the list of tools
src/pages/              Astro pages and routes
src/utils/              parsing and conversion logic
e2e/                    Playwright specs
extension/              browser extension source
```

## Adding or changing a tool

The quickest way to learn how a tool is wired up is to copy an existing one of similar shape (for example Env to Zod for a text-in, text-out converter). Look at how it is registered in `src/config/tools.ts`, how its page is routed, and which spec covers it. A new tool needs:

1. The component and its conversion logic, running fully client-side.
2. An entry in the tool list so it appears in the site and the sitemap.
3. An end-to-end spec in `e2e/` (see Testing below).
4. Clear error messages for bad input. A tool that fails silently is worse than no tool.

## Testing

End-to-end tests use Playwright, and CI runs them in Chromium on every pull request. A weekly job also runs Firefox.

```bash
pnpm exec playwright test e2e/your-tool.spec.ts --project=chromium
```

Some lessons from earlier flaky tests:

- **Wait for hydration before you type.** Tool components set `data-hydrated="true"` on their root element once React has mounted. Specs should wait for it, for example `await page.waitForSelector('[data-hydrated="true"]')` right after `page.goto(...)`. Without it, typed text can be overwritten when React hydrates.
- **Put `ref` and the marker on an element that exists on first render**, not inside a loading branch.
- **Use specific locators.** `getByRole('button', { name: /copy/i })` fails when a page has three copy buttons.
- **Check that no stale dev server is running** before you test (`lsof -nP -iTCP:4321 -sTCP:LISTEN`). The test setup reuses an existing server on port 4321, and an old one makes everything look broken.
- **Timing-sensitive tests are noisy when run in parallel.** If one fails locally, retry it alone with `--workers=1` before assuming it is broken.

## Code style

- TypeScript, React function components, Tailwind v4 utility classes.
- `pnpm lint` must report **0 errors**. There are existing warnings (unused variables, `any` types). Fixing them is welcome and a good first contribution.
- Keep the diff small and focused. Do not reformat files you are not changing.
- Keep text readable: use the existing slate colours and check contrast, and do not tell links apart by colour alone.

## Commits and pull requests

1. Fork the repository and create a branch from `main`.
2. Use clear commit messages in the style already used here: `fix: ...`, `feat: ...`, `test: ...`, `docs: ...`, `chore: ...`.
3. Run `pnpm build`, `pnpm lint` and the relevant Playwright specs before you push.
4. Open a pull request against `main` and describe what changed, why, and how you tested it. Screenshots help for visual changes.
5. CI must pass (Cloudflare Pages build and Playwright). A maintainer reviews every pull request.

## AI-assisted contributions

This project is built with AI coding assistants, and you are welcome to use them too. You are responsible for what you submit: read it, run it, and be able to explain it. Pull requests that are unreviewed AI output will be closed.

## Reporting security issues

Do not open a public issue for a security problem. Email contact@syntaxsnap.com with the details instead.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
