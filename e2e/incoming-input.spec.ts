// e2e/incoming-input.spec.ts
// Every tool the Chrome extension links to must accept text in the URL fragment
// (#input=...), which never reaches the server, and still accept the legacy ?input=.
import { test, expect, type Page } from '@playwright/test';

const JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtYXJrZXItand0IiwibmFtZSI6IkV4dGVuc2lvbiJ9.c2lnbmF0dXJl';

const CASES: { slug: string; text: string; marker: string }[] = [
  { slug: 'json-formatter', text: '{"marker_fmt": 1}', marker: 'marker_fmt' },
  { slug: 'json-viewer', text: '{"marker_view": [1, 2]}', marker: 'marker_view' },
  { slug: 'json-to-typescript', text: '{"marker_ts": true}', marker: 'marker_ts' },
  { slug: 'json-to-zod', text: '{"marker_zod": "x"}', marker: 'marker_zod' },
  { slug: 'ts-to-zod', text: 'interface MarkerTs { markerTsZod: string }', marker: 'markerTsZod' },
  { slug: 'openapi-to-zod', text: '{"openapi":"3.0.0","components":{"schemas":{"MarkerApi":{"type":"object"}}}}', marker: 'MarkerApi' },
  { slug: 'graphql-to-zod', text: 'type MarkerGql { id: ID! }', marker: 'MarkerGql' },
  { slug: 'jwt-debugger', text: JWT, marker: JWT.slice(0, 30) },
  { slug: 'base64', text: 'bWFya2VyX2Jhc2U2NA==', marker: 'bWFya2VyX2Jhc2U2NA==' },
  { slug: 'timestamp-converter', text: '1767225600', marker: '1767225600' },
  { slug: 'regex-tester', text: 'marker regex sample text', marker: 'marker regex sample text' },
  { slug: 'diff-viewer', text: 'marker diff left side', marker: 'marker diff left side' },
  { slug: 'svg-to-jsx', text: '<svg viewBox="0 0 10 10"><path id="marker-svg" d="M0 0h10"/></svg>', marker: 'marker-svg' },
  { slug: 'env-to-zod', text: 'MARKER_ENV=1', marker: 'MARKER_ENV' },
  { slug: 'prisma-to-zod', text: 'model MarkerPrisma {\n  id Int @id\n}', marker: 'MarkerPrisma' },
  { slug: 'pydantic-to-zod', text: 'class MarkerPy(BaseModel):\n    name: str', marker: 'MarkerPy' },
];

async function fieldValues(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('textarea, input[type="text"], input:not([type])')]
      .map((el) => (el as HTMLInputElement).value)
      .join('\n'),
  );
}

for (const c of CASES) {
  test(`${c.slug} reads #input= from the fragment and clears it`, async ({ page }) => {
    await page.goto(`/tools/${c.slug}?utm_source=extension#input=${encodeURIComponent(c.text)}`);
    await expect.poll(() => fieldValues(page), { timeout: 15_000 }).toContain(c.marker);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('');
  });
}

test('legacy ?input= still works', async ({ page }) => {
  await page.goto(`/tools/json-to-zod?input=${encodeURIComponent('{"legacy_marker": 1}')}`);
  await expect.poll(() => fieldValues(page), { timeout: 15_000 }).toContain('legacy_marker');
});
