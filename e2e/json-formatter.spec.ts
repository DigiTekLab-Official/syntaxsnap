// e2e/json-formatter.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, output, expectCopyAndDownload } from './helpers/json-hub';

test.describe('JSON Formatter', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-formatter'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /JSON Formatter Online – Free, Private, No Upload/, 'JSON Formatter and Beautifier');
  });

  test('beautifies the sample with 2 spaces, then 4', async ({ page }) => {
    await expect(output(page)).toContainText('"status": "paid"');
    await expect(output(page)).toContainText('\n  "id": "ord_8f2c"');
    await page.getByRole('radio', { name: '4 spaces' }).click();
    await expect(output(page)).toContainText('\n    "id": "ord_8f2c"');
    await expect(page.getByText('Valid JSON', { exact: true })).toBeVisible();
  });

  test('invalid input shows the error with line and column', async ({ page }) => {
    await page.locator('#json-in').fill('{"a": 1,}');
    const err = page.locator('[data-error]');
    await expect(err).toContainText('Line 1, column 8: Trailing comma before }. Remove the last comma.');
    await expect(page.locator('[data-error-line="1"]')).toBeAttached();
    await expect(err.getByRole('button', { name: 'Fix common errors' })).toBeVisible();
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    expect((await download).suggestedFilename()).toBe('formatted.json');
  });
});
