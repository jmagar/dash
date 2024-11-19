const webpack = require('webpack');
const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  style: {
    postcss: {
      mode: 'file',
    },
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src/'),
      'path': require.resolve('path-browserify'),
      'os': require.resolve('os-browserify/browser'),
    },
    configure: (webpackConfig) => {
      // Add TypeScript paths support
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins || [];
      webpackConfig.resolve.plugins.push(
        new TsconfigPathsPlugin({
          configFile: path.resolve(__dirname, './tsconfig.json'),
          extensions: ['.ts', '.tsx', '.js', '.jsx']
        })
      );

      // Configure module resolution
      webpackConfig.resolve.modules = [
        'node_modules',
        path.resolve(__dirname, 'src'),
      ];

      // Configure polyfills and fallbacks
      webpackConfig.resolve.fallback = {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        util: require.resolve('util/'),
        assert: require.resolve('assert/'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        path: require.resolve('path-browserify'),
        process: require.resolve('process/browser.js'),
        zlib: require.resolve('browserify-zlib'),
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        ...webpackConfig.resolve.fallback,
      };

      // Remove ModuleScopePlugin which restricts imports to src/
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        plugin => !(plugin.constructor.name === 'ModuleScopePlugin')
      );

      // Add ProvidePlugin for polyfills
      webpackConfig.plugins = (webpackConfig.plugins || []).concat([
        new webpack.ProvidePlugin({
          process: ['process/browser.js'],
          Buffer: ['buffer', 'Buffer'],
          path: ['path-browserify'],
          os: ['os-browserify/browser'],
        }),
      ]);

      return webpackConfig;
    },
  },
  jest: {
    configure: {
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  },
};
