// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      '.astro/**',
      '.wrangler/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'extension/**',
    ],
  },

  // ── Base JS/TS rules ────────────────────────────────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Global settings for all source files ────────────────────────────────────
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Relax rules that conflict with Astro's patterns
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ── Tool isolation: forbid cross-tool imports ───────────────────────────────
  {
    files: ['src/components/tools/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./*', '!.'],
              message:
                'Cross-tool imports are forbidden to maintain strict architectural isolation.',
            },
          ],
        },
      ],
    },
  },

  // ── Astro files: parser not available, skip type-aware rules ────────────────
  {
    files: ['**/*.astro'],
    ...tseslint.configs.disableTypeChecked,
  },
);
