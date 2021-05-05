require('dotenv').config();
require('app-module-path').addPath(__dirname);

const path = require('path');
const fs = require('fs');

const Roboclaw = require('classes/Roboclaw.js');
const Curve = require('classes/Curve.js');

const eventLoop = require('classes/EventLoop.js');

const express = require('express');
const app = express();

if(process.env.NODE_ENV == 'development') {
  console.log('Running in development mode!');
  const webpack = require('webpack');
  const middleware = require('webpack-dev-middleware');
  const options = require('webpack.dev');
  app.use(middleware(webpack(options), {
    serverSideRender: true,
    index: false,
    writeToDisk: true,
    publicPath: '/',
  }));
}

// Setup static files
app.use(express.static('dist', {index: false}));
app.use('/public', express.static('public'));

// Setup the view engine
app.set('views', path.resolve(__dirname, 'dist'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.get('*', (req, res) => {
  res.render('index.html');
})

app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${process.env.PORT}`);
});

eventLoop.start();

const rc = new Roboclaw('/dev/ttyS0', {
  baudRate: Number.parseInt(process.env.BAUDRATE, 10),
  scaleFactor: 20305 / 360,
});

rc.on('open', () => {
  console.log('SerialPort:', 'Initalized.');
});

rc.on('error', (err) => {
  console.error('SerialPort:', err);
});
