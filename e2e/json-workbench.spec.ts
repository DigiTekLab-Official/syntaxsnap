// e2e/json-workbench.spec.ts — behaviour shared by the JSON Hub editor.
import { test } from '@playwright/test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, openTool, output } from './helpers/json-hub';

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

test.describe('JSON workbench: tree view', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-viewer'); });

  test('expands, collapses and searches', async ({ page }) => {
    const deep = page.locator('[data-row="$.releases[0].assets[1].name"]');
    await expect(deep).toHaveCount(0);

    // Rows are virtualised, so check the row count rather than what is on screen.
    const tree = page.locator('[data-tree-rows]');
    const before = Number(await tree.getAttribute('data-tree-rows'));
    await page.getByRole('button', { name: 'Expand all' }).click();
    await expect.poll(async () => Number(await tree.getAttribute('data-tree-rows'))).toBeGreaterThan(before + 20);

    await page.getByRole('button', { name: 'Collapse all' }).click();
    await expect(tree).toHaveAttribute('data-tree-rows', '5');
    await expect(page.locator('[data-row="$.repository"]')).toBeVisible();
    await expect(page.locator('[data-row="$.repository.name"]')).toHaveCount(0);

    // Toggle one branch open and closed again.
    await page.getByRole('button', { name: 'Expand repository' }).click();
    await expect(page.locator('[data-row="$.repository.name"]')).toBeVisible();
    await page.getByRole('button', { name: 'Collapse repository' }).click();
    await expect(page.locator('[data-row="$.repository.name"]')).toHaveCount(0);

    // Search opens the parents of the match and highlights it.
    await page.getByLabel('Search keys and values').fill('macos');
    await expect(page.locator('[data-match-count]')).toHaveText('1 of 1');
    await expect(deep).toBeVisible();
    await expect(deep).toHaveAttribute('data-match', 'true');
  });

  test('clicking a node copies its JSONPath', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox does not grant clipboard permissions to Playwright');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    // The second button in a row (after the expand toggle slot) copies the path.
    await page.locator('[data-row="$.repository.name"] button[title^="Copy path"]').click();
    await expect(page.locator('[data-copied-path]')).toHaveText('Copied $.repository.name');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('$.repository.name');
  });
});

test.describe('JSON workbench: input', () => {
  test('opens a file chosen with the file picker', async ({ page }) => {
    await openTool(page, 'json-formatter');
    await page.locator('[data-file-input]').setInputFiles(fixture('orders.json'));
    await expect(page.locator('#json-in')).toHaveValue(fs.readFileSync(fixture('orders.json'), 'utf8'));
    await expect(output(page)).toContainText('"source": "fixture-file"');
  });

  test('a 5 MB file formats without blocking the input', async ({ page }) => {
    test.setTimeout(120_000);
    await openTool(page, 'json-formatter');
    const rows = Array.from({ length: 34_000 }, (_, i) => ({
      id: i, sku: `SKU-${String(i).padStart(6, '0')}`, name: `Product number ${i}`,
      price: Math.round(i * 137.31) / 100, tags: ['alpha', 'beta', 'gamma'], meta: { warehouse: 'EU-1', stock: i % 97, active: i % 2 === 0 },
    }));
    const big = JSON.stringify(rows);
    expect(big.length).toBeGreaterThan(5 * 1024 * 1024);

    await page.locator('[data-file-input]').setInputFiles({ name: 'big.json', mimeType: 'application/json', buffer: Buffer.from(big) });
    const input = page.locator('#json-in');
    await expect(input).toHaveJSProperty('value.length', big.length, { timeout: 20_000 });

    // While the worker formats, the page must keep handling input.
    const started = Date.now();
    await input.focus();
    await input.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(el.value.length, el.value.length));
    await page.keyboard.type(' ');
    const ping = await page.evaluate(() => new Promise<number>((resolve) => {
      const t = performance.now();
      requestAnimationFrame(() => resolve(performance.now() - t));
    }));
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(ping).toBeLessThan(1_000);
    await expect(input).toBeEditable({ timeout: 2_000 });

    await expect(page.getByText('Valid JSON', { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/large file, processed in the background/)).toBeVisible();
    await expect(page.getByText(/Showing the first .* Copy and Download include everything\./)).toBeVisible();
  });
});

test.describe('JSON workbench: repair', () => {
  test('fixes LLM output with a code fence, comments and trailing commas', async ({ page }) => {
    await openTool(page, 'json-formatter');
    await page.locator('#json-in').fill(fs.readFileSync(fixture('llm-output.md'), 'utf8'));
    const err = page.locator('[data-error]');
    await expect(err).toBeVisible();
    await err.getByRole('button', { name: 'Fix common errors' }).click();
    await expect(page.getByText('Valid JSON', { exact: true })).toBeVisible();
    await expect(output(page)).toContainText('"id": 42');
    await expect(output(page)).toContainText(`"name": "Ann O'Neil"`);
    await expect(output(page)).toContainText('"active": true');
    await expect(output(page)).toContainText('"manager": null');
    // Words inside strings are left alone.
    await expect(output(page)).toContainText('"note": "True story, see None"');
  });

  test('JSONC mode accepts comments without rewriting the input', async ({ page }) => {
    await openTool(page, 'json-formatter');
    await page.locator('#json-in').fill('{\n  // compiler options\n  "strict": true,\n}');
    await expect(page.locator('[data-error]')).toContainText('Comments are not allowed in JSON.');
    await page.getByLabel('Allow comments (JSONC)').check();
    await expect(output(page)).toContainText('"strict": true');
  });
});
