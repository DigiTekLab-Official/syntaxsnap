// e2e/xml-to-json.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, output, expectCopyAndDownload } from './helpers/json-hub';

test.describe('XML to JSON', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'xml-to-json'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /XML to JSON Online – Free, Private, No Upload/, 'XML to JSON Converter');
  });

  test('converts the sample with prefixed attributes', async ({ page }) => {
    await expect(output(page)).toContainText('"@_id": "bk101"');
    await expect(output(page)).toContainText('"isbn": "0012345678"');
    await expect(output(page)).toContainText('"#text": 44.95');
    await page.getByLabel('Attribute prefix').fill('@');
    await expect(output(page)).toContainText('"@id": "bk101"');
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.locator('#conv-in').fill('<root><item></root>');
    await expect(page.locator('[data-error]')).toContainText("Expected closing tag 'item'");
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
  });
});
