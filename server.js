require('dotenv').config();
require('app-module-path').addPath(__dirname);

const path = require('path');
const fs = require('fs');

const Roboclaw = require('classes/Roboclaw.js');
const Simulation = require('classes/Simulation.js');

const eventLoop = require('classes/EventLoop.js');
eventLoop.start();

const express = require('express');
const app = express();
const http = require('http').Server(app);

const io = require('socket.io')(http);

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

app.get('/api/profiles/:axis/:name', async (req, res) => {
  const filePath = path.join(__dirname, 'profiles', req.params.axis, req.params.name);
  try {
    let file = await fs.promises.readFile(filePath, 'utf8');
    if(file) {
      file = file.replace(/(\r\n|\n|\r)/gm, '');
      const points = file.split(',');
      for(let i in points) {
        points[i] = parseFloat(points[i]);
      }
      res.json(points);
    } else {
      res.json(null);
    }
  } catch(error) {
    res.status(400).json({error});
  }
})


app.get('*', (req, res) => {
  res.render('index.html');
})

http.listen(process.env.PORT, () => {
  console.log(`Listening on port ${process.env.PORT}`);
});

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

const simulation = new Simulation(rc, io);

io.on('connection', (socket) => {

  socket.join('frame');

  socket.on('profiles.list', async (axis, callback) => {
    const dirPath = path.join(__dirname, 'profiles', axis);

    try {
      const files = await fs.promises.readdir(dirPath);
      callback(files);
    } catch(error) {
      callback({error});
    }
  });

  socket.on('cycle-duration.get', (callback) => {
    callback(simulation.duration);
  });

  socket.on('cycle-duration.set', (duration) => {
    console.log(duration);
    simulation.duration = duration;
  });

  socket.on('axis.profile.get', (name, callback) => {
    callback(simulation.getProfile(name));
  });

  socket.on('axis.profile.set', async (name, file, callback) => {
    const points = await simulation.setProfile(name, file);
    callback(points);
  });

  socket.on('motion.start', () => {
    simulation.start();
  });

  socket.on('motion.stop', () => {
    simulation.stop();
  });

  socket.on('motion.running', (callback) => {
    callback(simulation.running);
  });
});
