import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '.astro/**',
      'playwright-report/**',
      'test-results/**'
    ]
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      'react-hooks': reactHooks
    },
    rules: reactHooks.configs.flat.recommended.rules
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'arrow-body-style': ['error', 'as-needed'],
      'arrow-parens': ['error', 'as-needed'],
      'arrow-spacing': ['error', { after: true, before: true }],
      'func-style': ['error', 'expression'],
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error'
    }
  },
  {
    files: [
      'src/components/Map.astro',
      'src/components/Map.astro/*.js',
      'src/components/Map.astro/*.ts'
    ],
    rules: {
      'func-style': 'off',
      'no-console': 'off'
    }
  },
  {
    files: ['src/components/pdf-viewer/index.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off'
    }
  }
);
