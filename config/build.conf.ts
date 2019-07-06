import CompressionWebpackPlugin from 'compression-webpack-plugin';
import path from 'path';
import { Configuration } from 'webpack';
import nodeExternals from 'webpack-node-externals';

const cwd = path.join(__dirname, '../');

const config: Configuration = {
  devtool: 'source-map',
  entry: {
    index: path.join(cwd, 'src/index.ts'),
  },
  externals: [nodeExternals()],
  mode: 'production',
  module: {
    rules: [{
      exclude: /node_modules/,
      test: /\.ts$/,
      use: [{
        loader: 'ts-loader',
      }],
    }],
  },
  output: {
    filename: '[name].js',
    path: path.join(cwd, 'build'),
    sourceMapFilename: '[file].map',
    libraryTarget: 'umd',
  },
  plugins: [
    new CompressionWebpackPlugin(),
  ],
  resolve: {
    extensions: ['.js', '.ts', '.json'],
  },
  stats: {
    colors: true,
    errors: true,
    errorDetails: true,
    maxModules: 0,
    modules: true,
    moduleTrace: true,
    publicPath: true,
    reasons: true,
    timings: true,
  },
  target: 'node',
};

export default config;
