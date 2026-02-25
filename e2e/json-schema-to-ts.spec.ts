// e2e/json-schema-to-ts.spec.ts
import { test, expect } from '@playwright/test';

test.describe('JSON Schema to TypeScript E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/json-schema-to-ts');
    await page.waitForSelector('[data-hydrated="true"]', { timeout: 15000 });
  });

  test('should render the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('TypeScript');
  });

  test('should generate default TypeScript on load', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('export interface User', { timeout: 5000 });
    await expect(output).toContainText('id: string', { timeout: 5000 });
    await expect(output).toContainText('email: string', { timeout: 5000 });
  });

  test('should mark required fields without ? and optional fields with ?', async ({ page }) => {
    const output = page.locator('pre code');
    // "id" and "email" are required — no ? marker
    await expect(output).toContainText('id: string;', { timeout: 5000 });
    await expect(output).toContainText('email: string;', { timeout: 5000 });
    // "name" is NOT in required — should have ?
    await expect(output).toContainText('name?: string;', { timeout: 5000 });
    // "age" is NOT in required — should have ?
    await expect(output).toContainText('age?: number;', { timeout: 5000 });
  });

  test('should handle enum types', async ({ page }) => {
    const output = page.locator('pre code');
    // role has enum: ["admin", "editor", "viewer"]
    await expect(output).toContainText('"admin"', { timeout: 5000 });
    await expect(output).toContainText('"editor"', { timeout: 5000 });
    await expect(output).toContainText('"viewer"', { timeout: 5000 });
  });

  test('should handle array types', async ({ page }) => {
    const output = page.locator('pre code');
    // tags is array of strings
    await expect(output).toContainText('string[]', { timeout: 5000 });
  });

  test('should handle nested object types', async ({ page }) => {
    const output = page.locator('pre code');
    // address is a nested object with street, city, zip
    await expect(output).toContainText('street', { timeout: 5000 });
    await expect(output).toContainText('city', { timeout: 5000 });
    await expect(output).toContainText('zip', { timeout: 5000 });
  });

  test('should handle nested object required vs optional', async ({ page }) => {
    const output = page.locator('pre code');
    // In address: street & city are required, zip is optional
    await expect(output).toContainText('zip?:', { timeout: 5000 });
  });

  test('should handle additionalProperties as Record', async ({ page }) => {
    const output = page.locator('pre code');
    // metadata has additionalProperties: { type: "string" } → Record<string, string>
    await expect(output).toContainText('Record<string, string>', { timeout: 5000 });
  });

  test('should generate $defs as separate interfaces', async ({ page }) => {
    const output = page.locator('pre code');
    // Status and Product are in $defs
    await expect(output).toContainText('Status', { timeout: 5000 });
    await expect(output).toContainText('Product', { timeout: 5000 });
  });

  test('should generate Status as a type alias with union', async ({ page }) => {
    const output = page.locator('pre code');
    // Status enum → type alias "active" | "inactive" | "pending"
    await expect(output).toContainText('"active"', { timeout: 5000 });
    await expect(output).toContainText('"inactive"', { timeout: 5000 });
    await expect(output).toContainText('"pending"', { timeout: 5000 });
  });

  test('should generate Product interface with correct fields', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('productId', { timeout: 5000 });
    await expect(output).toContainText('price', { timeout: 5000 });
    await expect(output).toContainText('inStock', { timeout: 5000 });
    // categories is optional (not in required)
    await expect(output).toContainText('categories?:', { timeout: 5000 });
  });

  test('should show error for invalid JSON', async ({ page }) => {
    const textarea = page.getByLabel('JSON Schema input');
    await textarea.fill('{ not valid json }');
    await expect(page.locator('[role="alert"]')).toContainText('Invalid JSON', { timeout: 5000 });
  });

  test('should show error for non-schema JSON', async ({ page }) => {
    const textarea = page.getByLabel('JSON Schema input');
    await textarea.fill('{ "name": "test", "version": "1.0" }');
    await expect(page.locator('[role="alert"]')).toContainText('does not appear to be a JSON Schema', { timeout: 5000 });
  });

  test('should clear output on clear button', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    const output = page.locator('pre code');
    await expect(output).toHaveText('', { timeout: 3000 });
  });

  test('should reload example on Load Example button', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    await page.getByRole('button', { name: 'Load example' }).click();
    const output = page.locator('pre code');
    await expect(output).toContainText('export interface User', { timeout: 5000 });
  });

  test('should handle custom schema input', async ({ page }) => {
    const textarea = page.getByLabel('JSON Schema input');
    await textarea.fill(JSON.stringify({
      type: 'object',
      title: 'Cat',
      properties: {
        name: { type: 'string' },
        lives: { type: 'integer' },
        indoor: { type: 'boolean' },
      },
      required: ['name', 'lives'],
    }));
    const output = page.locator('pre code');
    await expect(output).toContainText('export interface Cat', { timeout: 5000 });
    await expect(output).toContainText('name: string', { timeout: 5000 });
    await expect(output).toContainText('lives: number', { timeout: 5000 });
    await expect(output).toContainText('indoor?: boolean', { timeout: 5000 });
  });

  test('should have a working copy button', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('export interface User', { timeout: 5000 });
    const copyBtn = page.getByRole('button', { name: /copy/i }).first();
    await expect(copyBtn).toBeVisible();
  });
});
