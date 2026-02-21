import { test, expect } from '@playwright/test';

test('SQL to JSON Tool parses correctly', async ({ page }) => {
  // 1. Navigate to the tool
  await page.goto('/tools/sql-to-json');

  // 2. Wait for the component to hydrate
  const textarea = page.locator('textarea');
  await expect(textarea).toBeVisible();
  
  // 3. Clear the sample SQL
  await page.click('button:has-text("Clear")');

  // 4. Fill with a test case that was failing earlier
  const testSql = 'CREATE TABLE users (id INT PRIMARY KEY, username VARCHAR(50) NOT NULL);';
  await textarea.fill(testSql);

  // 5. Verify JSON Schema Output
  const output = page.locator('pre');
  await expect(output).toContainText('"maxLength": 50', { timeout: 10000 });
  await expect(output).toContainText('"required": [', { timeout: 10000 });

  // 6. Switch to Zod Tab
  await page.click('button:has-text("Zod Schema")');

  // 7. Verify the production-grade Zod syntax
  // This verifies the parenthesis fix: .string().max(50)
  await expect(output).toContainText('z.string().max(50)', { timeout: 10000 });
  
  // 8. Verify NOT NULL constraint handling
  // If NOT NULL is working, .optional() should NOT be present for username
  const zodContent = await output.textContent();
  const usernameLine = zodContent?.split('\n').find(line => line.includes('username'));
  expect(usernameLine).not.toContain('.optional()');
});