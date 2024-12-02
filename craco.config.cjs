var webpack = require('webpack');
var path = require('path');
var TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
var pathsToModuleNameMapper = require('ts-jest').pathsToModuleNameMapper;
var compilerOptions = require('./config/paths.json').compilerOptions;
var TerserPlugin = require('terser-webpack-plugin');
var threadLoader = require('thread-loader');
var WorkboxWebpackPlugin = require('workbox-webpack-plugin');

// Configure thread-loader
threadLoader.warmup({
  workers: 4,
  workerParallelJobs: 50,
}, [
  'babel-loader',
  'ts-loader',
  'style-loader',
  'css-loader',
]);

var paths = pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' });
paths['path'] = require.resolve('path-browserify');
paths['os'] = require.resolve('os-browserify/browser');

module.exports = {
  style: {
    postcss: {
      mode: 'file',
      loaderOptions: {
        postcssOptions: {
          sourceMap: process.env.NODE_ENV !== 'production',
        }
      }
    },
  },
  webpack: {
    alias: paths,
    configure: function(webpackConfig, opts) {
      var env = opts.env;
      var paths = opts.paths;
      
      // Add TypeScript paths support
      if (!webpackConfig.resolve.plugins) {
        webpackConfig.resolve.plugins = [];
      }
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
      };

      // Enable persistent caching
      webpackConfig.cache = {
        type: 'filesystem',
        version: '1.0',
        buildDependencies: {
          config: [__filename],
        },
        name: 'webpack-cache-' + env,
      };

      // Performance optimizations
      if (!webpackConfig.optimization) {
        webpackConfig.optimization = {};
      }

      webpackConfig.optimization.moduleIds = 'deterministic';
      webpackConfig.optimization.runtimeChunk = 'single';
      webpackConfig.optimization.minimize = true;
      webpackConfig.optimization.minimizer = [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            compress: {
              drop_console: env === 'production',
              drop_debugger: env === 'production',
            },
          },
        }),
      ];
      webpackConfig.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 20000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: function(module) {
              var packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
              return 'vendor.' + packageName.replace('@', '');
            },
            priority: -10,
            reuseExistingChunk: true,
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      };

      // Add thread-loader to JavaScript processing
      var jsRule = webpackConfig.module.rules.find(
        function(rule) { return rule.test && rule.test.toString().includes('jsx'); }
      );

      if (jsRule && jsRule.use) {
        jsRule.use = ['thread-loader'].concat(jsRule.use);
      }

      // Add PWA support
      if (env === 'production') {
        webpackConfig.plugins.push(
          new WorkboxWebpackPlugin.GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
            runtimeCaching: [
              {
                urlPattern: /^https?.*/,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  networkTimeoutSeconds: 10,
                  expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                  matchOptions: {
                    ignoreSearch: true,
                  },
                },
              },
              {
                urlPattern: /\.(?:png|jpg|jpeg|svg|gif|woff2?|ttf|eot)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'assets-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
              },
              {
                urlPattern: /\.(?:js|css)$/,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'static-resources',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 24 * 60 * 60, // 24 hours
                  },
                },
              },
            ],
            cleanupOutdatedCaches: true,
            exclude: [
              /\.map$/,
              /manifest\.json$/,
              /\.htaccess$/,
              /service-worker\.js$/,
              /sw\.js$/,
            ],
          })
        );
      }

      return webpackConfig;
    },
  },
  jest: {
    configure: {
      preset: 'ts-jest',
      moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' })
    }
  }
};
