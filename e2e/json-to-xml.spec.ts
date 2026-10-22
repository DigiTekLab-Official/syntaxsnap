// e2e/json-to-xml.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, output, expectCopyAndDownload } from './helpers/json-hub';

test.describe('JSON to XML', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-to-xml'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /JSON to XML Online – Free, Private, No Upload/, 'JSON to XML Converter');
  });

  test('converts the sample with the chosen root element', async ({ page }) => {
    await expect(output(page)).toContainText('<?xml version="1.0" encoding="UTF-8"?>');
    await expect(output(page)).toContainText('<rss version="2.0">');
    await expect(output(page)).toContainText('<category>viewer</category>');
    await page.getByLabel('Root element').fill('feed');
    await expect(output(page)).toContainText('<feed version="2.0">');
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.locator('#conv-in').fill('{"a": [1, 2,, 3]}');
    await expect(page.locator('[data-error]')).toContainText('Two commas in a row.');
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
  });
});
