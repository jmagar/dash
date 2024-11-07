module.exports = {
  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Quotes
  singleQuote: true,
  jsxSingleQuote: true,

  // Semicolons
  semi: true,

  // Trailing Commas
  trailingComma: 'es5',

  // Bracket Spacing
  bracketSpacing: true,

  // Bracket Line
  bracketSameLine: false,

  // Arrow Function Parentheses
  arrowParens: 'always',

  // Line Length
  printWidth: 120,

  // Prose Wrap
  proseWrap: 'always',

  // HTML Whitespace Sensitivity
  htmlWhitespaceSensitivity: 'css',

  // End of Line
  endOfLine: 'auto',

  // Overrides for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        singleQuote: false,
        trailingComma: 'none',
      }
    },
    {
      files: '*.yml',
      options: {
        singleQuote: false,
        printWidth: 80,
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      }
    },
    {
      files: '*.tsx',
      options: {
        singleQuote: true,
        jsxSingleQuote: true,
      }
    }
  ],

  // Plugins
  plugins: [
    '@trivago/prettier-plugin-sort-imports'
  ],

  // Import Sorting
  importOrder: [
    '^react$',
    '^@mui/(.*)$',
    '^@?\\w',
    '^src/(.*)$',
    '^[./]'
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true
};
