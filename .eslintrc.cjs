module.exports = {
  root: true,
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      excludedFiles: ['*.d.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.server.json'],
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        tsconfigRootDir: __dirname,
      },
      settings: {
        react: {
          version: 'detect',
        },
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: './tsconfig.json',
          },
          node: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            moduleDirectory: ['node_modules', 'src/'],
          },
        },
      },
      env: {
        browser: true,
        node: true,
        es6: true,
      },
      plugins: [
        '@typescript-eslint',
        'react',
        'react-hooks',
        'import',
        'jsx-a11y'
      ],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
        'plugin:jsx-a11y/recommended'
      ],
      rules: {
        // Disable some overly strict TypeScript rules
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/restrict-template-expressions': ['warn', {
          allowNumber: true,
          allowBoolean: true,
          allowAny: true,
          allowNullish: true,
        }],
        '@typescript-eslint/no-floating-promises': ['error', {
          ignoreVoid: true,
          ignoreIIFE: true
        }],
        '@typescript-eslint/no-misused-promises': ['error', {
          checksVoidReturn: {
            attributes: false
          }
        }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': 'off',
        'import/order': 'off',

        // React specific rules
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',

        // Import ordering rules
        'import/no-unresolved': 'error',
        'import/named': 'error',
        'import/default': 'error',
        'import/namespace': 'error'
      }
    }
  ]
}
