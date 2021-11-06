const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, options) => ({
  entry: {
    video: './src/video.js',
    background: './src/background.ts',
    popup: './src/popup.js',
    'anki-ui': './src/anki-ui.js',
    'video-name-ui': './src/video-name-ui.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: { extensions: [".ts", ".tsx", ".js"] },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader"
      },
      {
        test: /\.js$/,
        loader: "source-map-loader"
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        include: [
          path.resolve(__dirname, "./src/ui")
        ],
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(woff|woff2)$/,
        loader: 'url-loader?limit=100000'
      }
    ],
  },
  devtool: options.mode === 'development' ? 'cheap-module-source-map' : false,
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: "./src",
          globOptions: {
            ignore: [
                "**/services",
                "**/handlers",
                "**/ui"
            ],
          }
        },
      ],
      options: {
        concurrency: 100
      }
    }),
  ],
});