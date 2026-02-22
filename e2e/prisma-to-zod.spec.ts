import { test, expect } from '@playwright/test';

test.describe('Prisma to Zod Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/prisma-to-zod');
    
    // Wait for React hydration (client:idle defers until browser is idle)
    await page.waitForSelector('[data-hydrated="true"]', { timeout: 15000 });
    // Verify default output has rendered in the <pre> output panel
    await expect(page.locator('pre')).toContainText('export const UserSchema = z.object', { timeout: 5000 });
  });

  test('renders default schema and translates models to Zod correctly', async ({ page }) => {
    const outputArea = page.locator('pre');
    
    // Verify Enums and Models are parsed using the token-based logic
    await expect(outputArea).toContainText("export const RoleSchema = z.enum(['USER', 'ADMIN', 'MODERATOR']);");
    await expect(outputArea).toContainText('export const UserSchema = z.object');
    
    // Verify updated type mappings from the audit
    await expect(outputArea).toContainText('age: z.number().int().nullable()'); // Int? -> .int().nullable()
    await expect(outputArea).toContainText("role: RoleSchema.default('USER')"); // Enum default handling
    await expect(outputArea).toContainText('createdAt: z.coerce.date()'); // DateTime -> coerce.date (now() is auto-generated, no .default())
  });

  test('generates CreateInput schemas automatically', async ({ page }) => {
    const outputArea = page.locator('pre');
    
    // Verify the auto-generated Input schema logic
    await expect(outputArea).toContainText('// Input schema');
    await expect(outputArea).toContainText('export const UserCreateInputSchema = UserSchema.omit(');
    await expect(outputArea).toContainText('id: true');
    await expect(outputArea).toContainText('createdAt: true');
    await expect(outputArea).toContainText('updatedAt: true');
  });

  test('handles empty state and clears gracefully', async ({ page }) => {
    // Click the Clear button from the toolbar
    await page.locator('button[title="Clear"]').click();
    
    // After clearing, the placeholder state should show
    await expect(page.locator('text=Waiting for Prisma schema...')).toBeVisible({ timeout: 5000 });
  });

  test('translates custom user input schema', async ({ page }) => {
    const inputArea = page.locator('textarea').first();

    await page.locator('button[title="Clear"]').click();
    // Wait for clear to take effect
    await expect(page.locator('text=Waiting for Prisma schema...')).toBeVisible({ timeout: 5000 });
    
    await inputArea.fill(`model Product {
      id String @id
      price Decimal
      tags String[]
      metadata Json?
    }`);

    // Verify the output reacts (with timeout for debounce)
    const outputArea = page.locator('pre');
    await expect(outputArea).toContainText('export const ProductSchema = z.object', { timeout: 5000 });
    await expect(outputArea).toContainText('price: z.number()'); // Decimal -> number
    await expect(outputArea).toContainText('tags: z.array(z.string())');
    await expect(outputArea).toContainText('metadata: z.record(z.unknown()).nullable()'); // Json? -> record.nullable
  });

  test('copy button works via shared component', async ({ page, browserName }) => {
    if (browserName !== 'firefox') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    const copyButton = page.locator('button:has-text("Copy")').first();
    await copyButton.click();
    
    await expect(page.locator('button:has-text("Copied")')).toBeVisible({ timeout: 5000 });

    if (browserName !== 'firefox') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('export const UserSchema');
    }
  });
});