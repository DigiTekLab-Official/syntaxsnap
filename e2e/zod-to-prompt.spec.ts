// e2e/zod-to-prompt.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Zod to LLM Prompt E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/zod-to-prompt');
    await page.waitForSelector('[data-hydrated="true"]');
  });

  test('should generate prompt from default schema on load', async ({ page }) => {
    const output = page.locator('pre code');
    // Debounce is 300ms — allow time for conversion
    await expect(output).toContainText('<system>', { timeout: 2000 });
    await expect(output).toContainText('"fullName"');
    await expect(output).toContainText('"email"');
    await expect(output).toContainText('"age"');
    await expect(output).toContainText('"role"');
    await expect(output).toContainText('REQUIRED');
  });

  test('should extract chained constraints', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('min:', { timeout: 2000 });
    await expect(output).toContainText('max:');
    await expect(output).toContainText('must be a valid email');
    await expect(output).toContainText('must be an integer');
  });

  test('should mark optional fields correctly', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('OPTIONAL', { timeout: 2000 });
    // "bio" and "isActive" are optional in the default schema
    await expect(output).toContainText('"bio"');
    await expect(output).toContainText('"isActive"');
  });

  test('should include XML-tagged sections in output', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('<role>', { timeout: 2000 });
    await expect(output).toContainText('<instructions>', { timeout: 1000 });
    await expect(output).toContainText('<json_schema>', { timeout: 1000 });
    await expect(output).toContainText('<example_output>', { timeout: 1000 });
    await expect(output).toContainText('<constraints>', { timeout: 1000 });
  });

  test('should show error for non-object schema', async ({ page }) => {
    const input = page.getByLabel('Zod Schema input');
    const output = page.locator('pre code');

    await input.fill('const x = z.string()');
    await expect(output).toContainText('No z.object() found', { timeout: 1000 });
  });

  test('should show error for empty fields', async ({ page }) => {
    const input = page.getByLabel('Zod Schema input');
    const output = page.locator('pre code');

    await input.fill('const x = z.object({})');
    await expect(output).toContainText('Could not detect any fields', { timeout: 1000 });
  });

  test('should handle custom schema with describe using backticks', async ({ page }) => {
    const input = page.getByLabel('Zod Schema input');
    const output = page.locator('pre code');

    await input.fill(`const S = z.object({
  name: z.string().describe(\`User's name\`),
});`);

    await expect(output).toContainText("User's name", { timeout: 2000 });
  });

  test('should include example_output with field names', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('"fullName":', { timeout: 2000 });
    await expect(output).toContainText('"email":', { timeout: 1000 });
  });

  test('copy button should be visible', async ({ page }) => {
    const copyBtn = page.getByRole('button', { name: /copy prompt/i });
    await expect(copyBtn).toBeVisible();
  });
});
