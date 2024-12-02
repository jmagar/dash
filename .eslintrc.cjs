module.exports = {
  root: true,
  overrides: [
    {
      files: ['src/types/**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
      ],
      plugins: ['@typescript-eslint']
    },
    {
      files: ['src/server/**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./tsconfig.server.json'],
        tsconfigRootDir: __dirname
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking'
      ],
      plugins: ['@typescript-eslint']
    },
    {
      files: ['src/client/**/*.ts', 'src/client/**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./tsconfig.client.json'],
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true
        }
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
      ],
      plugins: ['@typescript-eslint', 'react', 'react-hooks']
    },
    {
      files: ['src/shared/**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended'
      ],
      plugins: ['@typescript-eslint']
    }
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    },
    react: {
      version: 'detect'
    }
  }
}
