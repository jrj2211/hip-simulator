require('dotenv').config();
require('app-module-path').addPath(__dirname);


// Parse config file
const yaml = require('js-yaml');
const Conf = require('conf');
process.config = new Conf({
  cwd: process.cwd(),
  fileExtension: 'yaml',
	serialize: yaml.dump,
	deserialize: yaml.load,
});

const path = require('path');
const fs = require('fs');

const Roboclaw = require('classes/Roboclaw.js');
const Simulation = require('classes/Simulation.js');
const AnalogToDigital = require('classes/AnalogToDigital.js');
const EventLoop = require('classes/EventLoop.js');
const Logger = require('classes/Logger.js');

const eventLoop = new EventLoop();
eventLoop.start();

const express = require('express');
const app = express();
const http = require('http').Server(app);
const multer = require('multer');
const io = require('socket.io')(http);

// Setup static files
app.use(express.static('dist', {index: false}));
app.use('/public', express.static('public'));

// Setup the view engine
app.set('views', path.resolve(__dirname, 'dist'));
app.engine('html', require('ejs').renderFile);
app.set('view engine',  'html');

// Bundle if in development mode
if(process.env.NODE_ENV == 'development') {
  console.log('Running in development mode!');
  const webpack = require('webpack');
  const middleware = require('webpack-dev-middleware');
  const options = require('webpack.dev');
  const instance = middleware(webpack(options), {
    serverSideRender: true,
    index: false,
    writeToDisk: true,
    publicPath: '/',
  });
  app.use(instance);

  instance.waitUntilValid(() => {
    main();
  });
} else {
  main();
}

function main() {

  /*****************************************************************************
   * ROUTES
   ****************************************************************************/

  var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `profiles/${req.params.motor}`);
    },
    filename: function (req, file, callback) {
      callback(null, file.originalname);
    }
  })
  var upload = multer({ storage: storage })

  app.get('/api/profiles/:motor/:name', async (req, res) => {
    const filePath = path.join(__dirname, 'profiles', req.params.motor, req.params.name);
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
  });

  app.post('/api/profiles/:motor/upload', upload.any(), async (req, res) => {
    res.json({error: false});
  });

  app.get('/api/logs/:name', (req, res) => {
    res.set('Content-disposition', 'attachment; filename=' + req.params.name);
    res.set('Content-Type', 'text/plain');

    const stream = logger.getFileStream(req.params.name);
    stream.pipe(res);
  })

  app.get('*', (req, res) => {
    res.render('index.html');
  })

  http.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT}`);
  });

  /*****************************************************************************
   * CONTROL
   ****************************************************************************/

  const rc = new Roboclaw('/dev/ttyS0', {
    baudRate: Number.parseInt(process.config.get('baudrate'), 10),
  });

  rc.on('open', () => {
    console.log('SerialPort:', 'Initalized.');
  });

  rc.on('error', (err) => {
    console.error('SerialPort:', err);
  });

  const simulation = new Simulation(rc, io, eventLoop);

  const logger = new Logger('logs');


  /*****************************************************************************
   * Websocket Communication to GUI
   ****************************************************************************/

  io.on('connection', (socket) => {

    socket.join('frame');
    socket.join('ads');
    socket.join('logs');

    socket.on('profiles.list', async (motor, callback) => {
      const dirPath = path.join(__dirname, 'profiles', motor.toString());

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
      simulation.duration = duration;
    });

    socket.on('axis.profile.get', (motor, callback) => {
      callback(simulation.getProfile(motor));
    });

    socket.on('axis.profile.set', async (motor, file, callback) => {
      const points = await simulation.setProfile(motor, file);
      if(typeof callback === 'function') {
        callback(points);
      }
    });

    socket.on('axis.profile.delete', async (motor, file, callback) => {
      const results = await simulation.deleteProfile(motor, file);
      if(typeof callback === 'function') {
        callback(results);
      }
    });

    socket.on('motion.goToStart', () => {
      simulation.goToStart();
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

    socket.on('logs.list', async (callback) => {
      try {
        callback(await logger.getList());
      } catch(error) {
        callback({error});
      }
    });

    socket.on('logs.delete', async (name, callback) => {
      try {
        callback(await logger.delete(name));
      } catch(error) {
        callback({error});
      }
    });

  });

  /*****************************************************************************
   * Analog to Digital
   ****************************************************************************/
  const ads = new AnalogToDigital();

  // Update the motor encoder based on ads value at boot
  ads.once('averages', (values) => {
    for(let motor in values) {
      const params = simulation.getMotorParams(motor);
      let position = values[motor] * params.scale_factor;
      rc.setEncValue(motor, position);
      console.log(`Motor ${motor} Home: ${position} (${values[motor]}%)`);
    }
  });

  /*****************************************************************************
   * LOGGING
   ****************************************************************************/
  const logLoop = new EventLoop(10);

  logLoop.register(ads);
  logLoop.start();

  simulation.on('stop', async () => {
    try {
      const name = await logger.save();
      io.to("logs").emit('logs.add', name);
    } catch(err) {
      console.error(err);
    }
  });

  // Setup the logger
  logger.setHeaders([
    'A1',
    'A2',
    'A3',
    'A3',
    'Load'
  ]);

  // On new encoder values
  ads.on('update', (values) => {
    io.to("ads").emit('ads.values', values);
    if(simulation.running) {
      logger.add([
        values[1],
        values[2],
        values[3],
        values[4],
        null
      ]);
    }
  });
}
