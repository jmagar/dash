module.exports = {
  plugins: [
    require('tailwindcss/nesting'),
    require('tailwindcss')('./tailwind.config.js'),
    require('autoprefixer')({
      flexbox: 'no-2009',
      grid: 'autoplace'
    })
  ].concat(process.env.NODE_ENV === 'production' ? [
    require('@fullhuman/postcss-purgecss')({
      content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
      defaultExtractor: function(content) {
        // Match any word characters, hyphens, forward slashes, or colons
        return content.match(/[A-Za-z0-9-_:/]+/g) || [];
      },
      safelist: {
        standard: [/^html/, /^body/, /^:/, /^dark:/, /^hover:/, /^focus:/, /^active:/],
        deep: [/dark$/, /light$/],
        greedy: [/safe$/]
      }
    }),
    require('cssnano')({
      preset: ['default', {
        discardComments: { removeAll: true },
        normalizeWhitespace: false,
        colormin: true,
        convertValues: true,
        discardEmpty: true,
        mergeLonghand: true,
        reduceTransforms: true
      }]
    })
  ] : [])
}
