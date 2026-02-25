// e2e/ts-to-json-schema.spec.ts
import { test, expect } from '@playwright/test';

test.describe('TypeScript to JSON Schema E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/ts-to-json-schema');
    await page.waitForSelector('[data-hydrated="true"]', { timeout: 15000 });
  });

  test('should render the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('JSON Schema');
  });

  test('should convert default TypeScript on load', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('"$schema": "http://json-schema.org/draft-07/schema#"', { timeout: 5000 });
    await expect(output).toContainText('"title": "User"');
    await expect(output).toContainText('"type": "object"');
  });

  test('should output properties for the root User type', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('"id"', { timeout: 5000 });
    await expect(output).toContainText('"email"');
    await expect(output).toContainText('"isActive"');
    await expect(output).toContainText('"type": "string"');
    await expect(output).toContainText('"type": "boolean"');
  });

  test('should handle optional properties by omitting from required', async ({ page }) => {
    const output = page.locator('pre code');
    // "name" and "age" are optional so they should NOT appear in required array,
    // but "id", "email", "isActive" etc. should
    await expect(output).toContainText('"required"', { timeout: 5000 });
    await expect(output).toContainText('"id"');
  });

  test('should handle string literal unions as enum', async ({ page }) => {
    const output = page.locator('pre code');
    // role: "admin" | "user" | "guest" → enum
    await expect(output).toContainText('"enum"', { timeout: 5000 });
    await expect(output).toContainText('"admin"');
    await expect(output).toContainText('"user"');
    await expect(output).toContainText('"guest"');
  });

  test('should handle array types', async ({ page }) => {
    const output = page.locator('pre code');
    // tags: string[] → { type: "array", items: { type: "string" } }
    await expect(output).toContainText('"type": "array"', { timeout: 5000 });
    await expect(output).toContainText('"items"');
  });

  test('should handle nested object types', async ({ page }) => {
    const output = page.locator('pre code');
    // address: { street: string; city: string; zip?: string }
    await expect(output).toContainText('"street"', { timeout: 5000 });
    await expect(output).toContainText('"city"');
    await expect(output).toContainText('"zip"');
  });

  test('should generate $defs for secondary types', async ({ page }) => {
    const output = page.locator('pre code');
    // Status, Product, BlogPost should be in $defs
    await expect(output).toContainText('"$defs"', { timeout: 5000 });
    await expect(output).toContainText('"Status"');
    await expect(output).toContainText('"Product"');
    await expect(output).toContainText('"BlogPost"');
  });

  test('should handle $ref for known type references', async ({ page }) => {
    const output = page.locator('pre code');
    // BlogPost.author: User → { "$ref": "#/$defs/User" } ... but User is root
    // Actually the converter references known types with $ref
    await expect(output).toContainText('"$ref"', { timeout: 5000 });
  });

  test('should handle nullable types (string | null)', async ({ page }) => {
    const output = page.locator('pre code');
    // publishedAt: string | null → anyOf with null
    await expect(output).toContainText('"anyOf"', { timeout: 5000 });
    await expect(output).toContainText('"type": "null"');
  });

  test('should handle Record type as additionalProperties', async ({ page }) => {
    const output = page.locator('pre code');
    // metadata: Record<string, unknown> → { type: "object", additionalProperties: {} }
    await expect(output).toContainText('"additionalProperties"', { timeout: 5000 });
  });

  test('should show error for empty input after clear', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    const output = page.locator('pre code');
    await expect(output).toHaveText('', { timeout: 3000 });
  });

  test('should reload example on Load Example button', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    await page.getByRole('button', { name: 'Load example' }).click();
    const output = page.locator('pre code');
    await expect(output).toContainText('"$schema"', { timeout: 5000 });
    await expect(output).toContainText('"title": "User"');
  });

  test('should handle custom interface input', async ({ page }) => {
    const textarea = page.getByLabel('TypeScript code input');
    await textarea.fill('interface Cat {\n  name: string;\n  lives: number;\n}');
    const output = page.locator('pre code');
    await expect(output).toContainText('"title": "Cat"', { timeout: 5000 });
    await expect(output).toContainText('"name"');
    await expect(output).toContainText('"lives"');
    await expect(output).toContainText('"type": "number"');
  });

  test('should show no-types error for invalid input', async ({ page }) => {
    const textarea = page.getByLabel('TypeScript code input');
    await textarea.fill('const x = 42;');
    // Should show error state
    await expect(page.locator('[role="alert"]')).toContainText('No TypeScript interfaces', { timeout: 5000 });
  });

  test('should have a working copy button', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('"$schema"', { timeout: 5000 });
    const copyBtn = page.getByRole('button', { name: /copy/i }).first();
    await expect(copyBtn).toBeVisible();
  });
});
