const webpack = require('webpack');
const path = require('path');

// Plugins
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    app: path.resolve(__dirname, 'app', 'js/app.js'),
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
    }),
    new HtmlWebpackPlugin({
      template: './app/template.html',
      filename: 'index.html',
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    modules: [path.resolve(__dirname, './app/'), path.resolve('./node_modules')],
  },
}
