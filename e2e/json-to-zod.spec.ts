// e2e/json-to-zod.spec.ts
import { test, expect } from '@playwright/test';

test.describe('JSON to Zod Converter Tool', () => {
  
  test('should load the page, render the UI, and verify SEO title', async ({ page }) => {
    // 1. Navigate to your local dev server
    await page.goto('http://localhost:4321/tools/json-to-zod');

    // 2. Verify the SEO title is correct
    await expect(page).toHaveTitle(/JSON to Zod Converter/i);

    // 3. Verify the main heading exists
    const heading = page.getByRole('heading', { name: 'JSON to Zod Schema' });
    await expect(heading).toBeVisible();

    // 4. Verify the React component mounted successfully
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
  });

  test('should instantly generate a Zod schema when valid JSON is typed', async ({ page }) => {
    // 1. Navigate to the tool
    await page.goto('http://localhost:4321/tools/json-to-zod');

    // 2. Locate the JSON input textarea
    const inputArea = page.locator('textarea').first();

    // 3. The tool loads with default JSON. We use .fill() to clear it and type our own.
    const customJson = `{
      "testString": "SyntaxSnap",
      "testNumber": 2026,
      "testBoolean": true
    }`;
    await inputArea.fill(customJson);

    // 4. Playwright is incredibly smart. It will automatically wait and retry these 
    // assertions until the React state updates and the text appears on the screen!
    
    // We expect the output to contain the correct inferred Zod types:
    await expect(page.locator('body')).toContainText('testString: z.string()');
    await expect(page.locator('body')).toContainText('testNumber: z.number()');
    await expect(page.locator('body')).toContainText('testBoolean: z.boolean()');
  });

});