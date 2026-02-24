import { test, expect } from '@playwright/test';

// Dev-server first-hit can take ~5 s on cold start; hydration via client:idle
// waits for requestIdleCallback which Playwright may delay.
test.describe('Env to Zod Converter', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/env-to-zod', { waitUntil: 'domcontentloaded' });

    // Wait for React hydration (client:idle defers until browser is idle).
    // Trigger idle callback by scrolling / hovering on the page.
    await page.mouse.move(300, 300);
    await page.waitForSelector('[data-hydrated="true"]', { timeout: 30_000 });

    // Verify the default example has been processed — proves React mounted,
    // state initialised, debounce fired, and converter ran.
    // Monaco renders inside [data-output-pane]; use it for all output assertions.
    await expect(page.locator('[data-output-pane]')).toContainText('envSchema', { timeout: 15_000 });
  });

  // ── Page & SEO ───────────────────────────────────────────────────────────

  test('renders page with correct SEO title and heading', async ({ page }) => {
    await expect(page).toHaveTitle(/Env to Zod Converter/i);

    const heading = page.getByRole('heading', { name: /Env to Zod/i });
    await expect(heading).toBeVisible();
  });

  // ── Default Example ──────────────────────────────────────────────────────

  test('renders default example with all inferred types', async ({ page }) => {
    const output = page.locator('[data-output-pane]');

    // DATABASE_URL uses postgres:// (not http/https) so it's treated as a string
    await expect(output).toContainText('DATABASE_URL: z.string().min(1)');
    // NEXT_PUBLIC_API_URL uses https:// so it's a URL
    await expect(output).toContainText('NEXT_PUBLIC_API_URL: z.string().url()');

    // Integer inference: PORT, API_TIMEOUT
    await expect(output).toContainText('PORT: z.coerce.number().int()');
    await expect(output).toContainText('API_TIMEOUT: z.coerce.number().int()');

    // Float inference: RATE_LIMIT
    await expect(output).toContainText('RATE_LIMIT: z.coerce.number()');

    // Boolean inference: IS_PROD
    await expect(output).toContainText("z.enum(['true', 'false'])");

    // Email inference: ADMIN_EMAIL
    await expect(output).toContainText('ADMIN_EMAIL: z.string().email()');

    // Plain string: NODE_ENV, LOG_LEVEL
    await expect(output).toContainText('NODE_ENV: z.string().min(1)');
    await expect(output).toContainText('LOG_LEVEL: z.string().min(1)');

    // Variable count badge
    await expect(page.locator('text=/11 variables parsed/i')).toBeVisible();
  });

  test('renders secret JSDoc warnings for sensitive keys', async ({ page }) => {
    const output = page.locator('[data-output-pane]');

    // JWT_SECRET, SMTP_PASSWORD should trigger secret detection
    await expect(output).toContainText('⚠️ Sensitive');
  });

  test('renders JSDoc comments from section headers', async ({ page }) => {
    const output = page.locator('[data-output-pane]');

    // Comment "# Database" should become /** Database */
    await expect(output).toContainText('/** Database */');
    await expect(output).toContainText('/** Server */');
    await expect(output).toContainText('/** Auth */');
  });

  // ── Clear & Load Example ─────────────────────────────────────────────────

  test('clears input and shows empty state', async ({ page }) => {
    const clearBtn = page.getByRole('button', { name: /Clear/i });
    await clearBtn.click();

    // Textarea should be empty
    const inputArea = page.locator('textarea').first();
    await expect(inputArea).toHaveValue('');

    // After clearing, Monaco output should no longer show schema content
    await expect(page.locator('[data-output-pane]')).not.toContainText('envSchema', { timeout: 5_000 });
  });

  test('Load Example restores default input after clearing', async ({ page }) => {
    // Clear first
    await page.getByRole('button', { name: /Clear/i }).click();
    await expect(page.locator('[data-output-pane]')).not.toContainText('envSchema', { timeout: 5_000 });

    // Then load example
    await page.getByRole('button', { name: /Load Example/i }).click();

    // Output should be back
    await expect(page.locator('[data-output-pane]')).toContainText('envSchema', { timeout: 10_000 });
    await expect(page.locator('text=/11 variables parsed/i')).toBeVisible({ timeout: 5_000 });
  });

  // ── Custom Input ─────────────────────────────────────────────────────────

  test('converts custom env input with mixed types', async ({ page }) => {
    const inputArea = page.locator('textarea').first();

    // Clear and fill custom input
    await page.getByRole('button', { name: /Clear/i }).click();
    await expect(page.locator('[data-output-pane]')).not.toContainText('envSchema', { timeout: 5_000 });

    await inputArea.fill(`# Custom Config
APP_NAME=SyntaxSnap
DEBUG=true
MAX_RETRIES=5
THRESHOLD=0.95
WEBSITE=https://syntaxsnap.com
CONTACT_EMAIL=hello@syntaxsnap.com
EMPTY_VAR=`);

    const output = page.locator('[data-output-pane]');

    // String
    await expect(output).toContainText('APP_NAME: z.string().min(1)', { timeout: 5_000 });
    // Boolean preprocess
    await expect(output).toContainText("z.enum(['true', 'false'])");
    // Integer with .int()
    await expect(output).toContainText('MAX_RETRIES: z.coerce.number().int()');
    // Float
    await expect(output).toContainText('THRESHOLD: z.coerce.number()');
    // URL
    await expect(output).toContainText('WEBSITE: z.string().url()');
    // Email
    await expect(output).toContainText('CONTACT_EMAIL: z.string().email()');
    // Empty
    await expect(output).toContainText('EMPTY_VAR: z.string()');

    // Count
    await expect(page.locator('text=/7 variables parsed/i')).toBeVisible({ timeout: 5_000 });
  });

  test('handles values containing equals signs (connection strings)', async ({ page }) => {
    const inputArea = page.locator('textarea').first();

    await page.getByRole('button', { name: /Clear/i }).click();
    await expect(page.locator('[data-output-pane]')).not.toContainText('envSchema', { timeout: 5_000 });

    await inputArea.fill('DB=postgres://u:p@host:5432/db?ssl=true&timeout=30');

    const output = page.locator('[data-output-pane]');
    // Value contains `=` — postgres:// is not http(s) so it's a string,
    // but crucially the `=` inside the value doesn't break the parser
    await expect(output).toContainText('DB: z.string().min(1)', { timeout: 5_000 });
  });

  test('handles inline comments correctly', async ({ page }) => {
    const inputArea = page.locator('textarea').first();

    await page.getByRole('button', { name: /Clear/i }).click();
    await expect(page.locator('[data-output-pane]')).not.toContainText('envSchema', { timeout: 5_000 });

    await inputArea.fill('PORT=8080 # production port');

    const output = page.locator('[data-output-pane]');
    // Inline comment stripped — value is "8080", inferred as integer
    await expect(output).toContainText('PORT: z.coerce.number().int()', { timeout: 5_000 });
  });

  test('handles case-insensitive booleans', async ({ page }) => {
    const inputArea = page.locator('textarea').first();

    await page.getByRole('button', { name: /Clear/i }).click();
    await expect(page.locator('[data-output-pane]')).not.toContainText('envSchema', { timeout: 5_000 });

    await inputArea.fill('ENABLED=TRUE\nDISABLED=False');

    const output = page.locator('[data-output-pane]');
    // Both should be matched as boolean regardless of case
    await expect(output).toContainText("z.enum(['true', 'false'])", { timeout: 5_000 });
    await expect(page.locator('text=/2 variables parsed/i')).toBeVisible({ timeout: 5_000 });
  });

  // ── Generated Boilerplate ────────────────────────────────────────────────

  test('output includes standard boilerplate (import, type, parse)', async ({ page }) => {
    const output = page.locator('[data-output-pane]');

    // Monaco uses virtual scrolling — only visible lines are rendered in the DOM.
    // The import + schema opening are near the top and always visible.
    await expect(output).toContainText('import { z } from "zod"');
    await expect(output).toContainText('export const envSchema = z.object(');

    // Scroll the Monaco editor to reveal the bottom-of-file boilerplate.
    await output.evaluate((el) => {
      const editor = el.querySelector('.monaco-scrollable-element');
      if (editor) editor.scrollTop = editor.scrollHeight;
    });
    await page.waitForTimeout(500);

    await expect(output).toContainText('export type Env = z.infer<typeof envSchema>', { timeout: 5_000 });
    await expect(output).toContainText('envSchema.parse(process.env)', { timeout: 5_000 });
  });

  // ── Copy Button ──────────────────────────────────────────────────────────

  test('copy button copies output to clipboard', async ({ page, browserName }) => {
    if (browserName !== 'firefox') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    const copyButton = page.locator('button:has-text("Copy")').first();
    await copyButton.click();

    // Button should change to "Copied!"
    await expect(page.locator('button:has-text("Copied")')).toBeVisible({ timeout: 5_000 });

    // Verify actual clipboard contents on chromium
    if (browserName !== 'firefox') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('export const envSchema');
    }
  });

  // ── Textarea Focus After Clear ───────────────────────────────────────────

  test('textarea receives focus after clearing', async ({ page }) => {
    await page.getByRole('button', { name: /Clear/i }).click();

    const inputArea = page.locator('textarea').first();
    await expect(inputArea).toBeFocused({ timeout: 2_000 });
  });

  // ── FAQ / SEO Content ────────────────────────────────────────────────────

  test('displays FAQ content below the tool', async ({ page }) => {
    await expect(page.locator('text=Why validate environment variables?')).toBeVisible();
    await expect(page.locator('text=How does this handle Booleans?')).toBeVisible();
  });
});
