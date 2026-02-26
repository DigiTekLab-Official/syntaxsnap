// e2e/sql-to-prisma.spec.ts
import { test, expect } from '@playwright/test';

test.describe('SQL to Prisma Schema E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/sql-to-prisma');
    await page.waitForSelector('[data-hydrated="true"]', { timeout: 15000 });
  });

  test('should render the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Prisma');
  });

  test('should generate default Prisma output on load', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('model User', { timeout: 5000 });
    await expect(output).toContainText('model Post', { timeout: 5000 });
    await expect(output).toContainText('model Category', { timeout: 5000 });
  });

  test('should map primary key with @id', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('@id', { timeout: 5000 });
  });

  test('should map SERIAL to @default(autoincrement())', async ({ page }) => {
    const output = page.locator('pre code');
    // users table has "id SERIAL PRIMARY KEY"
    await expect(output).toContainText('@default(autoincrement())', { timeout: 5000 });
  });

  test('should mark NOT NULL fields as required (no ?)', async ({ page }) => {
    const output = page.locator('pre code');
    // email is NOT NULL → String (no ?)
    await expect(output).toContainText('email  String', { timeout: 5000 });
  });

  test('should mark nullable fields with ?', async ({ page }) => {
    const output = page.locator('pre code');
    // bio is TEXT (nullable) → String?
    await expect(output).toContainText('String?', { timeout: 5000 });
  });

  test('should map BOOLEAN type', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('Boolean', { timeout: 5000 });
  });

  test('should map DEFAULT true for boolean', async ({ page }) => {
    const output = page.locator('pre code');
    // is_active BOOLEAN NOT NULL DEFAULT true
    await expect(output).toContainText('@default(true)', { timeout: 5000 });
  });

  test('should map DEFAULT false for boolean', async ({ page }) => {
    const output = page.locator('pre code');
    // published BOOLEAN NOT NULL DEFAULT false
    await expect(output).toContainText('@default(false)', { timeout: 5000 });
  });

  test('should map DEFAULT CURRENT_TIMESTAMP to @default(now())', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('@default(now())', { timeout: 5000 });
  });

  test('should map TIMESTAMP to DateTime', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('DateTime', { timeout: 5000 });
  });

  test('should map VARCHAR to String', async ({ page }) => {
    const output = page.locator('pre code');
    // Multiple VARCHAR fields in users/posts tables
    await expect(output).toContainText('String', { timeout: 5000 });
  });

  test('should handle UNIQUE constraint', async ({ page }) => {
    const output = page.locator('pre code');
    // slug VARCHAR(255) NOT NULL UNIQUE → @unique
    await expect(output).toContainText('@unique', { timeout: 5000 });
  });

  test('should convert snake_case to camelCase with @map', async ({ page }) => {
    const output = page.locator('pre code');
    // is_active → isActive @map("is_active")
    await expect(output).toContainText('isActive', { timeout: 5000 });
    await expect(output).toContainText('@map("is_active")', { timeout: 5000 });
  });

  test('should map table name with @@map', async ({ page }) => {
    const output = page.locator('pre code');
    // "users" table → model User with @@map("users")
    await expect(output).toContainText('@@map("users")', { timeout: 5000 });
  });

  test('should map INT default values', async ({ page }) => {
    const output = page.locator('pre code');
    // login_count INT NOT NULL DEFAULT 0
    await expect(output).toContainText('@default(0)', { timeout: 5000 });
  });

  test('should show error for non-SQL input', async ({ page }) => {
    const textarea = page.getByLabel('SQL input');
    await textarea.fill('this is not sql');
    await expect(page.locator('[role="alert"]')).toContainText('No CREATE TABLE', { timeout: 5000 });
  });

  test('should clear output on clear button', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    const output = page.locator('pre code');
    await expect(output).toHaveText('', { timeout: 3000 });
  });

  test('should reload example on Load Example button', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear input' }).click();
    await page.getByRole('button', { name: 'Load example' }).click();
    const output = page.locator('pre code');
    await expect(output).toContainText('model User', { timeout: 5000 });
  });

  test('should handle custom SQL input', async ({ page }) => {
    const textarea = page.getByLabel('SQL input');
    await textarea.fill(`CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  in_stock BOOLEAN DEFAULT true,
  description TEXT
);`);
    const output = page.locator('pre code');
    await expect(output).toContainText('model Product', { timeout: 5000 });
    await expect(output).toContainText('name  String', { timeout: 5000 });
    await expect(output).toContainText('Decimal', { timeout: 5000 });
    await expect(output).toContainText('description  String?', { timeout: 5000 });
  });

  test('should have a working copy button', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('model User', { timeout: 5000 });
    const copyBtn = page.getByRole('button', { name: /copy/i }).first();
    await expect(copyBtn).toBeVisible();
  });
});
