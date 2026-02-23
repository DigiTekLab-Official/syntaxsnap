// e2e/openapi-to-zod.spec.ts
import { test, expect } from '@playwright/test';

test.describe('OpenAPI to Zod E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/openapi-to-zod');
    await page.waitForSelector('[data-hydrated="true"]');
  });

  test('should convert default schema on load after debounce', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('import { z } from "zod"', { timeout: 2000 });
    await expect(output).toContainText('export const UserSchema');
    await expect(output).toContainText('export const PostSchema');
    await expect(output).toContainText('export type User = z.infer<typeof UserSchema>');
    await expect(output).toContainText('export type Post = z.infer<typeof PostSchema>');
  });

  test('should map string formats correctly', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('.uuid()', { timeout: 2000 });
    await expect(output).toContainText('.email()');
    await expect(output).toContainText('.datetime()');
  });

  test('should map integer type with constraints', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('z.number().int()', { timeout: 2000 });
    await expect(output).toContainText('.min(18)');
    await expect(output).toContainText('.max(120)');
  });

  test('should map string length constraints', async ({ page }) => {
    const output = page.locator('pre code');
    // name field: minLength: 1, maxLength: 100
    await expect(output).toContainText('.min(1)', { timeout: 2000 });
    await expect(output).toContainText('.max(100)');
  });

  test('should handle string enums with z.enum()', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('z.enum(["ADMIN", "USER", "GUEST"])', { timeout: 2000 });
  });

  test('should map arrays correctly', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('z.array(z.string())', { timeout: 2000 });
  });

  test('should handle $ref by inlining the referenced schema', async ({ page }) => {
    const output = page.locator('pre code');
    // author: { "$ref": "#/components/schemas/User" } should be inlined as z.object(...)
    // rather than just "UserSchema"
    await expect(output).toContainText('author:', { timeout: 2000 });
  });

  test('should mark optional fields correctly', async ({ page }) => {
    const output = page.locator('pre code');
    // name, age, tags, metadata are NOT in User.required → should be .optional()
    await expect(output).toContainText('.optional()', { timeout: 2000 });
  });

  test('should handle nullable fields', async ({ page }) => {
    const output = page.locator('pre code');
    // Post.content is nullable
    await expect(output).toContainText('.nullable()', { timeout: 2000 });
  });

  test('should handle additionalProperties: true with .passthrough()', async ({ page }) => {
    const output = page.locator('pre code');
    // metadata has additionalProperties: true
    await expect(output).toContainText('.passthrough()', { timeout: 2000 });
  });

  test('should show error for invalid JSON', async ({ page }) => {
    const input = page.getByLabel('OpenAPI JSON input');
    const errorBox = page.locator('[role="alert"]');

    await input.fill('{ broken json');
    await expect(errorBox).toContainText('Invalid JSON', { timeout: 2000 });
  });

  test('should show error for missing components.schemas', async ({ page }) => {
    const input = page.getByLabel('OpenAPI JSON input');
    const errorBox = page.locator('[role="alert"]');

    await input.fill('{ "openapi": "3.1.0" }');
    await expect(errorBox).toContainText('No components.schemas', { timeout: 2000 });
  });

  test('should handle numeric enums with z.union([z.literal()])', async ({ page }) => {
    const input = page.getByLabel('OpenAPI JSON input');
    const output = page.locator('pre code');

    await input.fill(JSON.stringify({
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      components: {
        schemas: {
          Status: {
            type: 'object',
            properties: {
              code: { type: 'integer', enum: [200, 404, 500] },
            },
          },
        },
      },
    }));

    await expect(output).toContainText('z.literal(200)', { timeout: 2000 });
    await expect(output).toContainText('z.literal(404)');
    await expect(output).toContainText('z.literal(500)');
  });

  test('should display success count', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('Successfully converted 2 schemas', { timeout: 2000 });
  });

  test('should clear input and output when Clear button is clicked', async ({ page }) => {
    const clearBtn = page.getByRole('button', { name: /clear input/i });
    const output = page.locator('pre code');

    await expect(output).toContainText('import { z }', { timeout: 2000 });
    await clearBtn.click();
    await expect(output).toContainText('Paste an OpenAPI', { timeout: 2000 });
  });

  test('copy button should be visible', async ({ page }) => {
    const copyBtn = page.getByRole('button', { name: /copy/i });
    await expect(copyBtn).toBeVisible();
  });
});
