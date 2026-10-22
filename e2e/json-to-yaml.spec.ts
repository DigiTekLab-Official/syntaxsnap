// e2e/json-to-yaml.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, output, expectCopyAndDownload } from './helpers/json-hub';

test.describe('JSON to YAML', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-to-yaml'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /JSON to YAML Online – Free, Private, No Upload/, 'JSON to YAML Converter');
  });

  test('converts the sample and quotes ambiguous strings', async ({ page }) => {
    await expect(output(page)).toContainText('apiVersion: apps/v1');
    await expect(output(page)).toContainText('replicas: 3');
    await expect(output(page)).toContainText("value: 'on'");
    await expect(output(page)).toContainText("value: '4'");
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.locator('#conv-in').fill('{"name": }');
    await expect(page.locator('[data-error]')).toContainText('Unexpected "}". Expected a value.');
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
  });
});
