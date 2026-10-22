// e2e/json-viewer.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, expectCopyAndDownload } from './helpers/json-hub';

test.describe('JSON Viewer', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-viewer'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /JSON Viewer Online – Free, Private, No Upload/, 'JSON Viewer: Explore JSON as a Tree');
  });

  test('shows the sample as a tree, two levels open', async ({ page }) => {
    await expect(page.locator('[data-tree]')).toBeVisible();
    await expect(page.locator('[data-row="$.repository.name"]')).toContainText('"syntaxsnap-demo"');
    // Third level stays closed on load.
    await expect(page.locator('[data-row="$.repository.owner"]')).toBeVisible();
    await expect(page.locator('[data-row="$.repository.owner.login"]')).toHaveCount(0);
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.locator('#json-in').fill('{"a": [1, 2}');
    await expect(page.locator('[data-error]')).toContainText('Expected "," or "]" after an array item, found "}".');
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
  });
});
