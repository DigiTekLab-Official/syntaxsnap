// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

// The master list of all 11 tool routes on SyntaxSnap
const toolRoutes = [
  'ai-mock-generator',
  'diff-viewer',
  'glass-generator',
  'json-to-zod',
  'jwt-debugger',
  'mesh-gradient',
  'openapi-mock',
  'openapi-to-express',
  'pydantic-to-zod',
  'regex-tester',
  'svg-to-jsx'
];

test.describe('Site-Wide Tool Pages Smoke Test', () => {
  // Loop through every route and generate a test for it
  for (const route of toolRoutes) {
    
    test(`Should load /tools/${route} with status 200 and an H1`, async ({ page }) => {
      // 1. Navigate to the page
      const response = await page.goto(`http://localhost:4321/tools/${route}`);
      
      // 2. Assert the server returned a successful 200 OK status
      expect(response?.status()).toBe(200);

      // 3. Assert the page didn't crash and rendered its main H1 heading
      const mainHeading = page.getByRole('heading', { level: 1 });
      await expect(mainHeading).toBeVisible();
    });
    
  }
});