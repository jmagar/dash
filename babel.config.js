module.exports = {
  presets: ['react-app'],
  plugins: [
    ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['@babel/plugin-proposal-private-methods', { loose: true }]
  ]
};
