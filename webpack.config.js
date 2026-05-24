const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const certDir = path.join(require('os').homedir(), '.office-addin-dev-certs');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: './src/taskpane/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'taskpane.js',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/taskpane/index.html',
        filename: 'taskpane.html',
        chunks: ['main'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'manifest.xml', to: 'manifest.xml' },
          { from: 'assets', to: 'assets' },
        ],
      }),
    ],
    devServer: {
      static: './dist',
      port: 3000,
      hot: false,
      liveReload: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      server: {
        type: 'https',
        options: {
          key: fs.readFileSync(path.join(certDir, 'localhost.key')),
          cert: fs.readFileSync(path.join(certDir, 'localhost.crt')),
          ca: fs.readFileSync(path.join(certDir, 'ca.crt')),
        },
      },
    },
    devtool: isDev ? 'eval-source-map' : 'source-map',
  };
};
