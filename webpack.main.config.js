const path = require('path');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    target: 'electron-main',
    entry: {
      main: './main.ts',
      preload: './preload.ts',
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: false,
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: { configFile: 'tsconfig.main.json' },
          },
          exclude: /node_modules/,
        },
      ],
    },
    externals: {
      electron: 'commonjs electron',
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    devtool: isDev ? 'source-map' : false,
  };
};
