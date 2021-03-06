require('dotenv').config();
require('app-module-path').addPath(__dirname);


// Parse config file
const yaml = require('js-yaml');
const Conf = require('conf');

function loadConfig() {
  process.config = new Conf({
    cwd: process.cwd(),
    fileExtension: 'yaml',
  	serialize: yaml.dump,
  	deserialize: yaml.load,
  });
}

loadConfig();

const path = require('path');
const fs = require('fs');

const Roboclaw = require('classes/Roboclaw.js');
const Simulation = require('classes/Simulation.js');
const AnalogToDigital = require('classes/AnalogToDigital.js');
const EventLoop = require('classes/EventLoop.js');
const Logger = require('classes/Logger.js');
const HX711 = require('pi-hx711');

const eventLoop = new EventLoop(50);
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
    res.download(logger.getLogPath(req.params.name));
  });

  app.get('*', (req, res) => {
    res.render('index.html');
  });

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

  const loadCell = new HX711(6, 5, {
    scale: () => process.config.get('loadcell.scale'),
    offset: () => process.config.get('loadcell.offset'),
    continous: 100,
  });

  /*****************************************************************************
   * Websocket Communication to GUI
   ****************************************************************************/

  io.on('connection', (socket) => {

    socket.join('frame');
    socket.join('ads');
    socket.join('loadcell');
    socket.join('logs');

    socket.on('profiles.list', async (motor, callback) => {
      const profiles = await simulation.getProfilesList(motor);
      callback(profiles);
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

    socket.on('motion.state', (callback) => {
      callback(simulation.running, simulation.atStart);
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

  simulation.on('state', async (running, atStart) => {
    io.to('frame').emit('motion.state', running, atStart)
  });

  /*****************************************************************************
   * Analog to Digital
   ****************************************************************************/
  const ads = new AnalogToDigital();

  // Update the motor encoder based on ads value at boot
  ads.once('averages', async (values) => {
    // Calibrate motors based on analog encoder
    const adsMotors = [0,1,2];

    for(let motor in adsMotors) {
      const params = simulation.getMotorParams(motor);
      let position = ((values[motor] / 100) * params.scale_factor) / 2;
      rc.setEncValue(motor, position);
      console.log(`Setting Motor ${motor} Pos: ${position} (${values[motor]}%)`);
    }

    // Calibrate load axis
    const load = await loadCell.read();
    const position = load * process.config.get('axis.3.conversion');
    rc.setEncValue(3, position);
    console.log(`Setting Load Axis Pos: ${position} (${load} ${process.config.get('loadcell.units')})`);
  });

  ads.active = true;

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
    'MS',
    'FLEXION',
    'ABDUCTION',
    'ROTATION',
    'VOLT',
    'LOAD',
  ]);

  // On new encoder values
  ads.on('update', async (values) => {
    const load = loadCell.getLast();

    io.to("ads").emit('ads.values', values, [
      process.config.get('ads.A0.units'),
      process.config.get('ads.A1.units'),
      process.config.get('ads.A2.units'),
      process.config.get('ads.A3.units'),
    ]);

    io.to("loadcell").emit('loadcell.value',
      load,
      process.config.get('loadcell.units'),
      process.config.get('loadcell.decimals')
    )

    if(simulation.running) {
      logger.add([
        simulation.elapsed,
        (values[0] / 100) * 180,
        (values[1] / 100) * 180,
        simulation.profiles[2].rawMotorPos,
        (values[3] / 100) * 180,
        load,
      ]);
    }
  });

}
