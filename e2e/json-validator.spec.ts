// e2e/json-validator.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, expectCopyAndDownload } from './helpers/json-hub';

test.describe('JSON Validator', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-validator'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /JSON Validator Online – Free, Private, No Upload/, 'JSON Validator');
  });

  test('lists every problem in the sample, and the fix makes it valid', async ({ page }) => {
    const banner = page.locator('[data-validation]');
    await expect(banner).toHaveAttribute('data-validation', 'fail');
    await expect(banner).toContainText('Invalid JSON · 3 problems found');
    const issues = page.locator('[data-issues] li');
    await expect(issues).toHaveCount(4);
    await expect(issues.nth(0)).toContainText('4:3');
    await expect(issues.nth(0)).toContainText('Strings must use double quotes');
    await expect(issues.nth(3)).toContainText('Duplicate key "port"');
    await banner.getByRole('button', { name: 'Fix common errors' }).click();
    await expect(banner).toHaveAttribute('data-validation', 'pass');
    await expect(banner).toContainText('Valid JSON');
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.locator('#json-in').fill('{"code": 007}');
    await expect(page.locator('[data-issues]')).toContainText('Numbers cannot have leading zeros.');
  });

  test('valid input passes', async ({ page }) => {
    await page.locator('#json-in').fill('{"ok": true, "items": [1, 2, 3]}');
    await expect(page.locator('[data-validation]')).toHaveAttribute('data-validation', 'pass');
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
  });
});
