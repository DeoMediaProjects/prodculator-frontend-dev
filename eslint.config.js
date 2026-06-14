import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', '*.config.js', '*.config.ts'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // This codebase predates ESLint and carries ~90 `any` casts and unused
      // bindings. Surface the existing debt as WARNINGS (lint still exits 0, so CI
      // is green today) while making genuinely new mistakes visible. Tighten these
      // to "error" incrementally as the backlog is paid down.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Rules new in ESLint 10 / react-hooks 7 that fire on pre-existing code.
      // Downgraded to warnings so the baseline is green; pay these down over time.
      // (react-hooks/rules-of-hooks is deliberately left at "error" — it catches
      // real crash bugs — and the one pre-existing violation was fixed.)
      'react-hooks/set-state-in-effect': 'warn',
      'preserve-caught-error': 'warn',
      'no-useless-assignment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
    },
  },
);
