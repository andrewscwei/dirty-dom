import HTMLPlugin from 'html-webpack-plugin';
import path from 'path';
import { Configuration } from 'webpack';

const cwd: string = path.join(__dirname, '../');
const inputDir: string = path.join(cwd, 'src');
const outputDir: string = path.join(cwd, 'build');

const config: Configuration = {
  devtool: 'source-map',
  entry: {
    bundle: path.join(inputDir, 'index.ts'),
  },
  mode: 'development',
  module: {
    rules: [{
      test: /\.ts$/,
      use: [{
        loader: 'babel-loader',
      }],
    }],
  },
  output: {
    filename: '[name].js',
    path: outputDir,
    publicPath: '/',
    sourceMapFilename: '[file].map',
  },
  plugins: [
    new HTMLPlugin({
      filename: 'index.html',
      inject: true,
      template: path.join(inputDir, 'templates', 'index.html'),
    }),
  ],
  resolve: {
    extensions: ['.js', '.ts'],
  },
  target: 'web',
};

export default config;
