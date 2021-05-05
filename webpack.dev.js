const path = require('path');
const { merge } = require('webpack-merge');
const { EnvironmentPlugin } = require('webpack');
const common = require('./webpack.common');

module.exports = merge(common, {
  mode: "development",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
});
