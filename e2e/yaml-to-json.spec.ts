// e2e/yaml-to-json.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, output, expectCopyAndDownload } from './helpers/json-hub';

test.describe('YAML to JSON', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'yaml-to-json'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /YAML to JSON Online – Free, Private, No Upload/, 'YAML to JSON Converter');
  });

  test('converts the sample with YAML 1.2 types', async ({ page }) => {
    await expect(output(page)).toContainText('"on": {');
    await expect(output(page)).toContainText('"RELEASE_DATE": "2026-10-22"');
    await expect(output(page)).toContainText('"CI": true');
  });

  test('invalid input shows a readable error', async ({ page }) => {
    await page.locator('#conv-in').fill('server:\n\tport: 8080\n');
    await expect(page.locator('[data-error]')).toContainText('Line 2, column 1: Tabs are used for indentation. YAML only allows spaces.');
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
  });
});
