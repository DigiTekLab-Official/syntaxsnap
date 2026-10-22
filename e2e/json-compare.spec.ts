// e2e/json-compare.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, expectCopyAndDownload } from './helpers/json-hub';

test.describe('JSON Compare', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-compare'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /JSON Compare Online – Free, Private, No Upload/, 'JSON Compare: Find the Differences');
  });

  test('compares the sample, ignoring key order', async ({ page }) => {
    await expect(page.locator('[data-summary]')).toHaveText('2 added · 1 removed · 2 changed');
    const changes = page.locator('[data-changes]');
    await expect(changes).toContainText('$.price.amount');
    await expect(changes).toContainText('$.legacy_code');
    // id and name were only reordered.
    await expect(changes).not.toContainText('$.id');
    await page.getByRole('radio', { name: 'Side by side text' }).click();
    await expect(page.locator('[data-text-diff]')).toContainText('+   "billing": "monthly"');
  });

  test('equal documents report no differences', async ({ page }) => {
    await page.locator('#cmp-left').fill('{"a": 1, "b": [1, 2]}');
    await page.locator('#cmp-right').fill('{\n  "b": [1, 2],\n  "a": 1.0\n}');
    await expect(page.locator('[data-equal]')).toBeVisible();
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.locator('#cmp-left').fill('{"a": ');
    await expect(page.getByText('Original · invalid')).toBeVisible();
    await expect(page.getByRole('button', { name: /The JSON ends early/ })).toBeVisible();
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page, 'Copy changes');
  });
});
