// e2e/ts-to-zod.spec.ts
import { test, expect } from '@playwright/test';

test.describe('TypeScript to Zod E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/ts-to-zod');
    await page.waitForSelector('[data-hydrated="true"]');
  });

  test('should convert default TypeScript on load', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('import { z } from "zod"', { timeout: 2000 });
    await expect(output).toContainText('export const UserSchema');
    await expect(output).toContainText('export const ProductSchema');
    await expect(output).toContainText('export const PostSchema');
    await expect(output).toContainText('export type User = z.infer<typeof UserSchema>');
  });

  test('should handle nested object types correctly', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('z.object({ street: z.string(), city: z.string(), zip: z.string().optional() })', { timeout: 2000 });
  });

  test('should convert type alias (union of string literals)', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('export const StatusSchema = z.enum(["ACTIVE", "INACTIVE", "PENDING"])', { timeout: 2000 });
    await expect(output).toContainText('export type Status = z.infer<typeof StatusSchema>');
  });

  test('should handle optional properties with .optional()', async ({ page }) => {
    const output = page.locator('pre code');
    // User.name? and User.age? should be optional
    await expect(output).toContainText('z.string().optional()', { timeout: 2000 });
    await expect(output).toContainText('z.number().optional()');
  });

  test('should handle string literal unions as z.enum', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('z.enum(["ADMIN", "USER", "GUEST"])', { timeout: 2000 });
  });

  test('should handle array types', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('z.array(z.string())', { timeout: 2000 });
  });

  test('should handle Record type', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('z.record(z.any())', { timeout: 2000 });
  });

  test('should handle nullable types (Date | null)', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('z.date().nullable()', { timeout: 2000 });
  });

  test('should reference other known types', async ({ page }) => {
    const output = page.locator('pre code');
    // Post.author references User
    await expect(output).toContainText('author: UserSchema', { timeout: 2000 });
  });

  test('should show success count matching type count', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('Successfully converted 4 types', { timeout: 2000 });
  });

  test('should show error for empty input after clear', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    const output = page.locator('pre code');
    await expect(output).toContainText('Paste your TypeScript', { timeout: 2000 });
  });

  test('should reload example on Load Example button', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    await page.getByRole('button', { name: 'Load example' }).click();
    const output = page.locator('pre code');
    await expect(output).toContainText('export const UserSchema', { timeout: 2000 });
  });

  test('should handle custom interface input', async ({ page }) => {
    const textarea = page.getByLabel('TypeScript code input');
    await textarea.fill('interface Cat {\n  name: string;\n  lives: number;\n}');
    const output = page.locator('pre code');
    await expect(output).toContainText('export const CatSchema = z.object(', { timeout: 2000 });
    await expect(output).toContainText('name: z.string()');
    await expect(output).toContainText('lives: z.number()');
    await expect(output).toContainText('Successfully converted 1 type');
  });

  test('should handle primitive type alias', async ({ page }) => {
    const textarea = page.getByLabel('TypeScript code input');
    await textarea.fill('type ID = string | number;');
    const output = page.locator('pre code');
    await expect(output).toContainText('export const IDSchema = z.union([z.string(), z.number()])', { timeout: 2000 });
  });

  test('should show no-types message for invalid input', async ({ page }) => {
    const textarea = page.getByLabel('TypeScript code input');
    await textarea.fill('const x = 42;');
    const output = page.locator('pre code');
    await expect(output).toContainText('No valid TypeScript interfaces or types detected', { timeout: 2000 });
  });

  test('should have a working copy button', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('export const UserSchema', { timeout: 2000 });
    const copyBtn = page.getByRole('button', { name: /copy/i }).first();
    await expect(copyBtn).toBeVisible();
  });
});
