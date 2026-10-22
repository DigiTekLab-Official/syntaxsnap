// e2e/json-to-csv.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, output, expectCopyAndDownload } from './helpers/json-hub';

test.describe('JSON to CSV', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-to-csv'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /JSON to CSV Online – Free, Private, No Upload/, 'JSON to CSV Converter');
  });

  test('converts the sample to a table and CSV with flattened columns', async ({ page }) => {
    const table = page.locator('[data-table-preview]');
    await expect(table.locator('th')).toContainText(['#', 'id', 'name', 'email', 'plan', 'address.city', 'address.country', 'tags', 'active']);
    await expect(table).toContainText('early-adopter; beta');
    await page.getByRole('radio', { name: 'CSV' }).click();
    await expect(output(page)).toContainText('id,name,email,plan,address.city,address.country,tags,active\n1001,Aisha Khan,aisha@example.com,pro,Pune,IN,early-adopter; beta,true');
    await page.getByRole('radio', { name: 'Semicolon' }).click();
    await expect(output(page)).toContainText('id;name;email;plan;address.city');
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.locator('#conv-in').fill('[{"id": 1]');
    await expect(page.locator('[data-error]')).toContainText('Expected "," or "}" after a property value, found "]".');
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    expect((await download).suggestedFilename()).toBe('data.csv');
  });
});
