// e2e/graphql-to-zod.spec.ts
import { test, expect } from '@playwright/test';

test.describe('GraphQL to Zod Schema E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/graphql-to-zod');
    await page.waitForSelector('[data-hydrated="true"]', { timeout: 15000 });
  });

  // ─── PAGE STRUCTURE ────────────────────────────────────────────────────────

  test('should render the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Zod');
  });

  test('should have a working copy button', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('UserSchema', { timeout: 5000 });
    const copyBtn = page.getByRole('button', { name: /copy/i }).first();
    await expect(copyBtn).toBeVisible();
  });

  // ─── DEFAULT OUTPUT ────────────────────────────────────────────────────────

  test('should generate default Zod output on load', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('UserSchema', { timeout: 5000 });
    await expect(output).toContainText('PostSchema', { timeout: 5000 });
    await expect(output).toContainText('CreateUserInputSchema', { timeout: 5000 });
    await expect(output).toContainText('RoleSchema', { timeout: 5000 });
    await expect(output).toContainText('StatusSchema', { timeout: 5000 });
  });

  test('should include zod import statement', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText("import { z } from 'zod'", { timeout: 5000 });
  });

  // ─── ENUM CONVERSION ──────────────────────────────────────────────────────

  test('should convert enum to z.enum()', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('z.enum(', { timeout: 5000 });
  });

  test('should include all enum values', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('"ADMIN"', { timeout: 5000 });
    await expect(output).toContainText('"EDITOR"', { timeout: 5000 });
    await expect(output).toContainText('"VIEWER"', { timeout: 5000 });
  });

  test('should generate multiple enum schemas', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('RoleSchema = z.enum(', { timeout: 5000 });
    await expect(output).toContainText('StatusSchema = z.enum(', { timeout: 5000 });
  });

  // ─── REQUIRED VS OPTIONAL (!) ──────────────────────────────────────────────

  test('should mark required fields without .optional()', async ({ page }) => {
    const output = page.locator('pre code');
    // name: String! → z.string() (no .optional())
    // Check that "name: z.string()," exists (required, no optional)
    await expect(output).toContainText('name: z.string(),', { timeout: 5000 });
  });

  test('should mark nullable fields with .optional()', async ({ page }) => {
    const output = page.locator('pre code');
    // email: String → z.string().optional()
    await expect(output).toContainText('z.string().optional()', { timeout: 5000 });
  });

  // ─── SCALAR MAPPINGS ──────────────────────────────────────────────────────

  test('should map ID to z.string()', async ({ page }) => {
    const output = page.locator('pre code');
    // id: ID! → z.string()
    await expect(output).toContainText('id: z.string(),', { timeout: 5000 });
  });

  test('should map Int to z.number()', async ({ page }) => {
    const output = page.locator('pre code');
    // age: Int → z.number().optional()
    await expect(output).toContainText('z.number().optional()', { timeout: 5000 });
  });

  test('should map Boolean to z.boolean()', async ({ page }) => {
    const output = page.locator('pre code');
    // isActive: Boolean! → z.boolean()
    await expect(output).toContainText('z.boolean(),', { timeout: 5000 });
  });

  test('should map Float to z.number()', async ({ page }) => {
    const textarea = page.getByLabel('GraphQL input');
    await textarea.fill(`type Product {\n  price: Float!\n  discount: Float\n}`);
    const output = page.locator('pre code');
    await expect(output).toContainText('price: z.number(),', { timeout: 5000 });
    await expect(output).toContainText('discount: z.number().optional(),', { timeout: 5000 });
  });

  // ─── ARRAY TYPES ──────────────────────────────────────────────────────────

  test('should handle required array [Type!]!', async ({ page }) => {
    const output = page.locator('pre code');
    // posts: [Post!]! → z.array(PostSchema)
    await expect(output).toContainText('z.array(PostSchema),', { timeout: 5000 });
  });

  test('should handle optional array [Type!]', async ({ page }) => {
    const output = page.locator('pre code');
    // tags: [String!] → z.array(z.string()).optional()
    await expect(output).toContainText('z.array(z.string()).optional()', { timeout: 5000 });
  });

  // ─── CUSTOM TYPE REFERENCES ───────────────────────────────────────────────

  test('should reference custom types as Schema names', async ({ page }) => {
    const output = page.locator('pre code');
    // role: Role! → RoleSchema
    await expect(output).toContainText('role: RoleSchema,', { timeout: 5000 });
  });

  test('should reference optional custom types with .optional()', async ({ page }) => {
    const output = page.locator('pre code');
    // In CreateUserInput: role: Role → RoleSchema.optional()
    await expect(output).toContainText('RoleSchema.optional()', { timeout: 5000 });
  });

  // ─── INPUT TYPES ──────────────────────────────────────────────────────────

  test('should convert input type to z.object()', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('export const CreateUserInputSchema = z.object({', { timeout: 5000 });
  });

  // ─── ERROR HANDLING ───────────────────────────────────────────────────────

  test('should show error for non-GraphQL input', async ({ page }) => {
    const textarea = page.getByLabel('GraphQL input');
    await textarea.fill('this is not graphql');
    await expect(page.locator('[role="alert"]')).toContainText('No GraphQL', { timeout: 5000 });
  });

  // ─── CLEAR & RELOAD ──────────────────────────────────────────────────────

  test('should clear output on clear button', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    const output = page.locator('pre code');
    await expect(output).toHaveText('', { timeout: 3000 });
  });

  test('should reload example on Load Example button', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    await page.getByRole('button', { name: 'Load example' }).click();
    const output = page.locator('pre code');
    await expect(output).toContainText('UserSchema', { timeout: 5000 });
  });

  // ─── CUSTOM INPUT ─────────────────────────────────────────────────────────

  test('should handle custom GraphQL input', async ({ page }) => {
    const textarea = page.getByLabel('GraphQL input');
    await textarea.fill(`enum Color {\n  RED\n  GREEN\n  BLUE\n}\n\ntype Shape {\n  id: ID!\n  color: Color!\n  label: String\n  sides: Int!\n}`);
    const output = page.locator('pre code');
    await expect(output).toContainText('ColorSchema = z.enum(["RED", "GREEN", "BLUE"])', { timeout: 5000 });
    await expect(output).toContainText('ShapeSchema = z.object({', { timeout: 5000 });
    await expect(output).toContainText('color: ColorSchema,', { timeout: 5000 });
    await expect(output).toContainText('sides: z.number(),', { timeout: 5000 });
    await expect(output).toContainText('label: z.string().optional(),', { timeout: 5000 });
  });

  test('should handle type with implements keyword', async ({ page }) => {
    const textarea = page.getByLabel('GraphQL input');
    await textarea.fill(`type User implements Node {\n  id: ID!\n  name: String!\n}`);
    const output = page.locator('pre code');
    await expect(output).toContainText('UserSchema = z.object({', { timeout: 5000 });
    await expect(output).toContainText('id: z.string(),', { timeout: 5000 });
  });
});
