// e2e/helpers/json-hub.ts — shared steps for the JSON Hub specs.
import { expect as baseExpect, type Page } from '@playwright/test';

/** The dev server compiles each converter on first use, so allow more than the 5 s default. */
export const expect = baseExpect.configure({ timeout: 15_000 });

/** Opens a tool page and waits until its React island has hydrated. */
export async function openTool(page: Page, slug: string) {
  await page.goto(`/tools/${slug}`);
  await expect(page.locator(`[data-tool="${slug}"][data-hydrated="true"]`)).toBeVisible({ timeout: 30_000 });
}

/** Checks the page <title> and its single H1. */
export async function expectHeading(page: Page, title: RegExp, h1: string) {
  await expect(page).toHaveTitle(title);
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveCount(1);
  await expect(heading).toHaveText(h1);
}

/** The formatted/converted text output pane. */
export const output = (page: Page) => page.locator('[data-output-pane]').first();

/** Copy and Download buttons for the result. */
export async function expectCopyAndDownload(page: Page, copyLabel = 'Copy') {
  await expect(page.getByRole('button', { name: copyLabel, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download', exact: true })).toBeVisible();
}
