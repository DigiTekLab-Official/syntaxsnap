import { test, expect } from '@playwright/test';

test.describe('SVG to JSX Converter Tool', () => {

  // Firefox hydration can be slower on dev servers — give 60s per test
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/svg-to-jsx');

    // Wait for React hydration — client:idle defers hydration until the browser
    // is idle. The most reliable hydration signal is the presence of the default
    // converted output in the <pre> element (aria-labelled for specificity).
    const outputPre = page.locator('pre[aria-label="Generated React JSX"]');
    await expect(outputPre).toContainText('className', { timeout: 30_000 });
  });

  // ─── 1. Page Load & SEO ──────────────────────────────────────────────────────

  test('should load with the correct SEO title and page heading', async ({ page }) => {
    // Verify the <title> tag
    await expect(page).toHaveTitle(/SVG to JSX Converter/i);

    // Verify the main H1 heading rendered by Astro
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText('SVG to JSX Transformer');
  });

  // ─── 2. Default Output ──────────────────────────────────────────────────────

  test('should render the default SVG and produce camelCase attributes in output', async ({ page }) => {
    const output = page.locator('pre[aria-label="Generated React JSX"]');

    // The default SVG contains stroke-width → strokeWidth, class → className,
    // text-anchor → textAnchor, font-size → fontSize
    await expect(output).toContainText('strokeWidth');
    await expect(output).toContainText('className="my-circle"');
    await expect(output).toContainText('textAnchor');
    await expect(output).toContainText('fontSize');
  });

  // ─── 3. Clear Button ────────────────────────────────────────────────────────

  test('should clear the input textarea and output when the Clear button is clicked', async ({ page }) => {
    const textarea = page.locator('textarea');
    const output   = page.locator('pre[aria-label="Generated React JSX"]');

    // Confirm default content is loaded
    await expect(textarea).not.toBeEmpty();
    await expect(output).toContainText('strokeWidth');

    // Click the Clear button
    const clearBtn = page.getByRole('button', { name: /clear/i });
    await clearBtn.click();

    // Input should now be empty
    await expect(textarea).toHaveValue('');

    // Output should no longer contain transformed attributes
    await expect(output).not.toContainText('strokeWidth', { timeout: 5_000 });
  });

  // ─── 4. Custom SVG Input ────────────────────────────────────────────────────

  test('should convert a user-pasted SVG and update the output', async ({ page }) => {
    const textarea = page.locator('textarea');
    const output   = page.locator('pre[aria-label="Generated React JSX"]');

    const customSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2L2 22h20L12 2z" fill-rule="evenodd" clip-rule="evenodd" stroke-linecap="round" />
</svg>`;

    await textarea.fill(customSvg);

    // Verify camelCase conversions in the output
    await expect(output).toContainText('fillRule="evenodd"', { timeout: 10_000 });
    await expect(output).toContainText('clipRule="evenodd"');
    await expect(output).toContainText('strokeLinecap="round"');
  });

  // ─── 5. Wrap in Functional Component Toggle ─────────────────────────────────

  test('should wrap output in a React functional component when toggle is checked', async ({ page }) => {
    const output = page.locator('pre[aria-label="Generated React JSX"]');

    // Toggle on: "Wrap in Functional Component"
    const wrapCheckbox = page.getByLabel(/Wrap in Functional Component/i);
    await wrapCheckbox.check();

    // The output should now contain the functional component wrapper
    await expect(output).toContainText('export default function SvgIcon()', { timeout: 10_000 });
    await expect(output).toContainText('return (');

    // Toggle off
    await wrapCheckbox.uncheck();
    await expect(output).not.toContainText('export default function SvgIcon', { timeout: 5_000 });
  });

  // ─── 6. Add {...props} Toggle ────────────────────────────────────────────────

  test('should inject {...props} into the root SVG tag when toggle is checked', async ({ page }) => {
    const output = page.locator('pre[aria-label="Generated React JSX"]');

    const propsCheckbox = page.getByLabel(/Add \{\.\.\.props\}/i);
    await propsCheckbox.check();

    await expect(output).toContainText('{...props}', { timeout: 10_000 });

    // Toggle off
    await propsCheckbox.uncheck();
    await expect(output).not.toContainText('{...props}', { timeout: 5_000 });
  });

  // ─── 7. Both Toggles Combined ───────────────────────────────────────────────

  test('should wrap with props signature when both toggles are active', async ({ page }) => {
    const output = page.locator('pre[aria-label="Generated React JSX"]');

    await page.getByLabel(/Wrap in Functional Component/i).check();
    await page.getByLabel(/Add \{\.\.\.props\}/i).check();

    // When both are on: function receives props and svg has {...props}
    await expect(output).toContainText('export default function SvgIcon(props)', { timeout: 10_000 });
    await expect(output).toContainText('{...props}');
  });

  // ─── 8. Output Click-to-Select ──────────────────────────────────────────────

  test('should select all text in the output when the <pre> area is clicked', async ({ page }) => {
    const output = page.locator('pre[aria-label="Generated React JSX"]');

    // Click the output area to trigger handleSelectAll
    await output.click();

    // Verify a selection was created (getSelection().toString() returns the selected text)
    const selectedText = await page.evaluate(() => window.getSelection()?.toString() ?? '');
    expect(selectedText.length).toBeGreaterThan(0);

    // The selection should contain part of the converted JSX output
    expect(selectedText).toContain('svg');
  });

  // ─── 9. XSS Sanitization ────────────────────────────────────────────────────

  test('should strip <script> tags and event handlers from malicious SVG input', async ({ page }) => {
    const textarea = page.locator('textarea');
    const output   = page.locator('pre[aria-label="Generated React JSX"]');

    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" onclick="alert('xss')" />
  <script>alert('pwned')</script>
</svg>`;

    await textarea.fill(maliciousSvg);

    // Wait for debounced conversion
    await expect(output).toContainText('<svg', { timeout: 10_000 });

    // Verify script and event handlers were stripped
    const outputText = await output.textContent();
    expect(outputText).not.toContain('<script');
    expect(outputText).not.toContain('alert');
    expect(outputText).not.toContain('onclick');
  });

});
