const webpack = require('webpack');
const path = require('path');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add TypeScript paths support
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins || [];
      webpackConfig.resolve.plugins.push(
        new TsconfigPathsPlugin({
          configFile: path.resolve(__dirname, './tsconfig.json'),
          extensions: ['.ts', '.tsx', '.js', '.jsx']
        })
      );

      // Add support for importing .node files
      webpackConfig.module.rules.push({
        test: /\.node$/,
        loader: 'node-loader',
      });

      // Configure module resolution
      webpackConfig.resolve.modules = [
        'node_modules',
        path.resolve(__dirname, 'src'),
      ];

      // Add support for native modules
      webpackConfig.resolve.fallback = webpackConfig.resolve.fallback || {};
      Object.assign(webpackConfig.resolve.fallback, {
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        path: require.resolve('path-browserify'),
        buffer: require.resolve('buffer/'),
        process: false,
        util: require.resolve('util/'),
        http: require.resolve('stream-http'),
        https: false,
        url: false,
        assert: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        zlib: require.resolve('browserify-zlib'),
        os: require.resolve('os-browserify/browser'),
        vm: require.resolve('vm-browserify'),
      });

      // Add polyfills
      webpackConfig.plugins = webpackConfig.plugins || [];
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          process: require.resolve('process/browser'),
          Buffer: ['buffer', 'Buffer'],
          os: ['os-browserify/browser'],
        })
      );

      // Add ESLint plugin
      webpackConfig.plugins.push(
        new ESLintPlugin({
          extensions: ['js', 'jsx', 'ts', 'tsx'],
          failOnError: false,
          emitWarning: true,
        })
      );

      // Remove ModuleScopePlugin
      webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
        plugin => !plugin.constructor || plugin.constructor.name !== 'ModuleScopePlugin'
      );

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
