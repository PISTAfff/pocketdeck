/**
 * Web ESLint config (flat).
 *
 * Loads the Next.js plugin directly instead of going through FlatCompat
 * + the legacy `next/core-web-vitals` preset — the compat shim crashed
 * with a circular-JSON error on certain plugin combinations. The flat
 * config below pulls the same rule sets piece-by-piece.
 */
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // react-hooks v6 added very strict purity rules that flag legitimate
      // patterns (e.g., assigning to a useRef.current during render for
      // values that don't need to survive renders). The pure-render rules
      // are useful in theory but the codebase predates them; treat as
      // warnings rather than blocking errors.
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/unsupported-syntax': 'warn',
      // Mutating R3F's `useThree(s => s.camera)` is the standard imperative
      // pattern for tuning camera fov/position; the new rule doesn't know
      // about the framework's mutable conventions.
      'react-hooks/immutability': 'warn',
    },
  },
];
