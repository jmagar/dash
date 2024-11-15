const webpack = require('webpack');
const paths = require('react-scripts/config/paths');
const getClientEnvironment = require('react-scripts/config/env');
const configFactory = require('react-scripts/config/webpack.config');

// Get environment variables to inject into our app.
const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));

module.exports = function override(webpackEnv) {
  // Get the default Create React App config
  const config = configFactory(webpackEnv);

  // Add fallbacks for Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    path: require.resolve('path-browserify'),
    fs: false,
    os: require.resolve('os-browserify/browser'),
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer/'),
  };

  // Add polyfills
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  // Exclude server code from the client build
  config.module.rules.push({
    test: /\.(ts|tsx)$/,
    include: paths.appSrc,
    exclude: [/server/],
    use: [
      {
        loader: require.resolve('ts-loader'),
        options: {
          configFile: 'tsconfig.client.json',
        },
      },
    ],
  });

  return config;
};
