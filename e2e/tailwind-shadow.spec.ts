import { test, expect } from '@playwright/test';

test.describe('Tailwind Shadow & Glow Generator', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/tailwind-shadow-generator', { waitUntil: 'domcontentloaded' });

    // client:idle defers hydration until the browser is idle — nudge it
    await page.mouse.move(300, 300);
    await page.waitForSelector('[data-hydrated="true"]', { timeout: 30_000 });

    // Wait for the output bar to render the default Tailwind class
    await expect(page.locator('[data-tailwind-class]')).toContainText('shadow-[', { timeout: 10_000 });
  });

  // ── Page & SEO ─────────────────────────────────────────────────────────────

  test('renders page with correct title and heading', async ({ page }) => {
    await expect(page).toHaveTitle(/Tailwind Shadow.*Generator/i);

    const heading = page.getByRole('heading', { name: /Tailwind Shadow/i });
    await expect(heading).toBeVisible();
  });

  // ── Default State ──────────────────────────────────────────────────────────

  test('loads with two default layers', async ({ page }) => {
    const layerTabs = page.locator('[role="tab"]');
    await expect(layerTabs).toHaveCount(2);
    await expect(layerTabs.first()).toHaveText('Layer 1');
    await expect(layerTabs.nth(1)).toHaveText('Layer 2');
  });

  test('Layer 1 is active by default', async ({ page }) => {
    const layer1 = page.getByRole('tab', { name: 'Layer 1' });
    await expect(layer1).toHaveAttribute('aria-selected', 'true');
  });

  test('default output contains multi-layer shadow class', async ({ page }) => {
    const output = page.locator('[data-tailwind-class]');
    const text = await output.textContent();
    // Should have two layers separated by a comma
    expect(text).toContain('shadow-[');
    expect(text).toContain(',');
    // First layer: blue glow (rgba with 59,130,246 = #3b82f6)
    expect(text).toContain('rgba(59,130,246,');
    // Second layer: dark shadow
    expect(text).toContain('rgba(0,0,0,');
  });

  test('preview box has box-shadow style applied', async ({ page }) => {
    const box = page.locator('[data-preview-box]');
    const shadow = await box.evaluate((el) => getComputedStyle(el).boxShadow);
    // Should not be 'none' — the default layers produce a visible shadow
    expect(shadow).not.toBe('none');
    expect(shadow).not.toBe('');
  });

  // ── Layer Switching ────────────────────────────────────────────────────────

  test('switching to Layer 2 updates active tab and slider values', async ({ page }) => {
    const layer2 = page.getByRole('tab', { name: 'Layer 2' });
    await layer2.click();
    await expect(layer2).toHaveAttribute('aria-selected', 'true');

    // Layer 2 defaults: y=10, blur=15, spread=-3, opacity=50
    await expect(page.locator('[data-value="y"]')).toHaveText('10px');
    await expect(page.locator('[data-value="blur"]')).toHaveText('15px');
    await expect(page.locator('[data-value="spread"]')).toHaveText('-3px');
    await expect(page.locator('[data-value="opacity"]')).toHaveText('50%');
  });

  // ── Add Layer ──────────────────────────────────────────────────────────────

  test('adds a new layer and selects it', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: 'Add shadow layer' });
    await addBtn.click();

    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(2)).toHaveText('Layer 3');

    // New layer should be auto-selected
    await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  });

  test('add button disappears at max layers', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: 'Add shadow layer' });

    // We start with 2 layers, max is 8 → click 6 more times
    for (let i = 0; i < 6; i++) {
      await addBtn.click();
      // Wait for new tab to appear
      await expect(page.locator('[role="tab"]')).toHaveCount(3 + i);
    }

    await expect(page.locator('[role="tab"]')).toHaveCount(8);
    // The add button should no longer be rendered
    await expect(addBtn).toBeHidden();
  });

  // ── Remove Layer ───────────────────────────────────────────────────────────

  test('deletes the active layer and falls back to first', async ({ page }) => {
    // Switch to Layer 2 then delete it
    await page.getByRole('tab', { name: 'Layer 2' }).click();
    await page.getByRole('button', { name: 'Delete layer' }).click();

    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toHaveText('Layer 1');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  });

  test('delete button is hidden when only one layer remains', async ({ page }) => {
    // Delete Layer 2 first
    await page.getByRole('tab', { name: 'Layer 2' }).click();
    await page.getByRole('button', { name: 'Delete layer' }).click();

    // Only 1 layer left — delete button should be gone
    await expect(page.getByRole('button', { name: 'Delete layer' })).toBeHidden();
  });

  // ── Slider Interaction ─────────────────────────────────────────────────────

  test('adjusting X Offset slider updates value and output class', async ({ page }) => {
    const slider = page.locator('#slider-x');
    const outputBefore = await page.locator('[data-tailwind-class]').textContent();

    // Set X to 20
    await slider.fill('20');

    await expect(page.locator('[data-value="x"]')).toHaveText('20px');

    const outputAfter = await page.locator('[data-tailwind-class]').textContent();
    expect(outputAfter).not.toBe(outputBefore);
    expect(outputAfter).toContain('20px_');
  });

  test('adjusting Blur slider updates output class', async ({ page }) => {
    const slider = page.locator('#slider-blur');
    await slider.fill('100');

    await expect(page.locator('[data-value="blur"]')).toHaveText('100px');
    const output = await page.locator('[data-tailwind-class]').textContent();
    expect(output).toContain('100px_');
  });

  test('adjusting Opacity slider updates rgba alpha', async ({ page }) => {
    const slider = page.locator('#slider-opacity');
    await slider.fill('75');

    await expect(page.locator('[data-value="opacity"]')).toHaveText('75%');
    const output = await page.locator('[data-tailwind-class]').textContent();
    expect(output).toContain('0.75)');
  });

  // ── Inset Toggle ───────────────────────────────────────────────────────────

  test('toggling inset checkbox adds inset_ prefix to output', async ({ page }) => {
    const checkbox = page.getByLabel('Toggle inset shadow');
    await checkbox.check();

    const output = await page.locator('[data-tailwind-class]').textContent();
    expect(output).toContain('inset_');
  });

  test('unchecking inset removes inset_ prefix', async ({ page }) => {
    const checkbox = page.getByLabel('Toggle inset shadow');
    await checkbox.check();
    await checkbox.uncheck();

    const output = await page.locator('[data-tailwind-class]').textContent();
    // First layer should NOT have inset prefix
    expect(output?.startsWith('shadow-[inset_')).toBe(false);
  });

  // ── Copy Button ────────────────────────────────────────────────────────────

  test('copy button copies Tailwind class to clipboard', async ({ page, context, browserName }) => {
    // Firefox does not support granting clipboard-read permission via Playwright
    test.skip(browserName === 'firefox', 'clipboard API not supported in Firefox Playwright');

    // Grant clipboard-write permission
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const copyBtn = page.getByRole('button', { name: /Copy.*class/i });
    await copyBtn.click();

    // Verify button text changes to "Copied!"
    await expect(copyBtn).toContainText('Copied!');

    // Verify clipboard content
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('shadow-[');
  });

  // ── Output Format Safety ───────────────────────────────────────────────────

  test('output class has no unescaped spaces', async ({ page }) => {
    const output = await page.locator('[data-tailwind-class]').textContent();
    // The inner value (between the brackets) must not contain literal spaces
    const match = output?.match(/shadow-\[(.+)\]/);
    expect(match).toBeTruthy();
    expect(match![1]).not.toContain(' ');
  });

  test('output class uses underscores for space encoding', async ({ page }) => {
    const output = await page.locator('[data-tailwind-class]').textContent();
    expect(output).toContain('_');
    // Should contain px_ patterns (offset_blur_spread encoding)
    expect(output).toMatch(/\dpx_/);
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  test('sliders have proper aria-label attributes', async ({ page }) => {
    for (const label of ['X Offset', 'Y Offset', 'Blur', 'Spread', 'Opacity']) {
      const slider = page.getByLabel(label, { exact: true });
      await expect(slider).toBeVisible();
      await expect(slider).toHaveAttribute('type', 'range');
    }
  });

  test('layer tabs have aria-selected state', async ({ page }) => {
    const layer1 = page.getByRole('tab', { name: 'Layer 1' });
    const layer2 = page.getByRole('tab', { name: 'Layer 2' });

    await expect(layer1).toHaveAttribute('aria-selected', 'true');
    await expect(layer2).toHaveAttribute('aria-selected', 'false');

    await layer2.click();
    await expect(layer1).toHaveAttribute('aria-selected', 'false');
    await expect(layer2).toHaveAttribute('aria-selected', 'true');
  });
});
