const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    target: 'web',
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist', 'renderer'),
      filename: 'bundle.js',
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
        template: './src/index.html',
        filename: 'index.html',
        scriptLoading: 'blocking',
        meta: {
          'Content-Security-Policy': {
            'http-equiv': 'Content-Security-Policy',
            content: "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: blob:; connect-src 'self' ws: http://localhost:*",
          },
        },
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'node_modules/@neutralinojs/lib/dist/neutralino.js',
            to: 'neutralino.js',
          },
        ],
      }),
    ],
    devtool: isDev ? 'eval-source-map' : false,
  };
};
