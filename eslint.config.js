import { resolve } from 'node:path';

import astro from 'eslint-plugin-astro';

import nkzw from '@nkzw/eslint-config';

export default [
  {
    ignores: ['**/dist/**', '.astro/**', 'src/components/ui/**']
  },
  ...nkzw,
  ...astro.configs['flat/recommended'],
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'arrow-body-style': ['error', 'as-needed'],
      'arrow-parens': ['error', 'as-needed'],
      'arrow-spacing': ['error', { after: true, before: true }],
      'func-style': ['error', 'expression'],
      'import-x/no-unresolved': ['error', { ignore: ['^astro:'] }],
      'no-var': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'react/no-unknown-property': 'off'
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: resolve(process.cwd(), './tsconfig.json')
        }
      }
    }
  },
  {
    files: ['**/*.astro'],
    rules: {
      'react/jsx-key': 'off',
      'react/no-unescaped-entities': 'off'
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
      'no-console': 'off',
      'unicorn/prefer-top-level-await': 'off'
    }
  },
  {
    files: ['src/components/pdf-viewer/index.tsx'],
    rules: {
      'react-hooks/set-state-in-effect': 'off'
    }
  }
];
