// e2e/trpc-to-openapi.spec.ts
import { test, expect } from '@playwright/test';

test.describe('tRPC to OpenAPI E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/trpc-to-openapi');
    await page.waitForSelector('[data-hydrated="true"]');
  });

  test('should generate OpenAPI spec from default router on load', async ({ page }) => {
    const output = page.locator('pre code');
    // Wait for debounce + conversion
    await expect(output).toContainText('"openapi": "3.1.0"', { timeout: 2000 });
    await expect(output).toContainText('/trpc/getUser');
    await expect(output).toContainText('/trpc/createUser');
    await expect(output).toContainText('/trpc/deleteUser');
    await expect(output).toContainText('/trpc/listUsers');
  });

  test('should map queries to GET and mutations to POST', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('"openapi": "3.1.0"', { timeout: 2000 });

    const json = await output.textContent();
    const spec = JSON.parse(json!);

    expect(spec.paths['/trpc/getUser']).toHaveProperty('get');
    expect(spec.paths['/trpc/listUsers']).toHaveProperty('get');
    expect(spec.paths['/trpc/createUser']).toHaveProperty('post');
    expect(spec.paths['/trpc/deleteUser']).toHaveProperty('post');
  });

  test('should produce typed schema properties from Zod input', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('"openapi": "3.1.0"', { timeout: 2000 });

    const json = await output.textContent();
    const spec = JSON.parse(json!);

    // createUser has name: z.string(), email: z.string().email(), age: z.number().int().optional()
    const createSchema =
      spec.paths['/trpc/createUser'].post.requestBody.content['application/json'].schema;
    expect(createSchema.properties.name).toEqual(
      expect.objectContaining({ type: 'string', minLength: 1, maxLength: 100 }),
    );
    expect(createSchema.properties.email).toEqual(
      expect.objectContaining({ type: 'string', format: 'email' }),
    );
    expect(createSchema.properties.age).toEqual(
      expect.objectContaining({ type: 'integer', minimum: 18 }),
    );
    // name and email are required; age is optional
    expect(createSchema.required).toContain('name');
    expect(createSchema.required).toContain('email');
    expect(createSchema.required).not.toContain('age');
  });

  test('should handle procedures without .input()', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('"openapi": "3.1.0"', { timeout: 2000 });

    const json = await output.textContent();
    const spec = JSON.parse(json!);

    // listUsers has no .input() — should still appear as GET with no parameters
    const listOp = spec.paths['/trpc/listUsers'].get;
    expect(listOp).toBeDefined();
    expect(listOp.parameters).toBeUndefined();
    expect(listOp.requestBody).toBeUndefined();
  });

  test('should show error for non-router input', async ({ page }) => {
    const input = page.getByLabel('tRPC router input');
    const output = page.locator('pre code');

    await input.fill('const x = 42;');
    await expect(output).toContainText('Could not detect a tRPC router', { timeout: 1000 });
  });

  test('should show error for router with no procedures', async ({ page }) => {
    const input = page.getByLabel('tRPC router input');
    const output = page.locator('pre code');

    await input.fill('const r = router({});');
    await expect(output).toContainText('No procedures found', { timeout: 1000 });
  });

  test('should include tags for queries and mutations', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('"openapi": "3.1.0"', { timeout: 2000 });

    const json = await output.textContent();
    const spec = JSON.parse(json!);

    expect(spec.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Queries' }),
        expect.objectContaining({ name: 'Mutations' }),
      ]),
    );
  });

  test('should format operation summaries from camelCase', async ({ page }) => {
    const output = page.locator('pre code');
    await expect(output).toContainText('Get User', { timeout: 2000 });
    await expect(output).toContainText('Create User');
    await expect(output).toContainText('Delete User');
  });

  test('copy button should be visible', async ({ page }) => {
    const copyBtn = page.getByRole('button', { name: /copy json/i });
    await expect(copyBtn).toBeVisible();
  });
});
