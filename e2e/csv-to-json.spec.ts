// e2e/csv-to-json.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, output, expectCopyAndDownload } from './helpers/json-hub';

test.describe('CSV to JSON', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'csv-to-json'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /CSV to JSON Online – Free, Private, No Upload/, 'CSV to JSON Converter');
  });

  test('converts the sample with a detected delimiter and inferred types', async ({ page }) => {
    await expect(output(page)).toContainText('"customer": "Rossi; Figli"');
    await expect(output(page)).toContainText('"total": 249.9');
    await expect(output(page)).toContainText('"paid": true');
    await expect(output(page)).toContainText('"zip": "01067"');
    await expect(page.getByText(/semicolon-separated \(detected\)/)).toBeVisible();
    await page.getByLabel('Infer types').uncheck();
    await expect(output(page)).toContainText('"paid": "true"');
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.locator('#conv-in').fill('id,name\n1,"Ann\n2,Bob');
    await expect(page.locator('[data-error]')).toContainText('A quoted cell is probably missing its closing quote.');
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
  });
});
