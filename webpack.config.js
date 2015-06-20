require('babel/register')({stage: 0});

var webpack = require('webpack');
var path = require('path');
var fs = require('fs');

var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function(mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });

module.exports = {
  entry: './src/index.js',
  resolve: {
    extensions: ['', '.js']
  },
  target: 'node',
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'server.js'
  },
  module: {
    loaders: [
      {test: /\.js?$/, exclude: /node_modules/, loaders:
        ['babel-loader?stage=0&optional=runtime']}
    ]
  },
  externals: nodeModules,
  devtool: 'eval-source-map'
}

    // preLoaders: [
    //   {test: /\.js?$/, loader: "eslint-loader", exclude: /node_modules/}
    // ],
