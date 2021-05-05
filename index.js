require('app-module-path').addPath(__dirname);

const Roboclaw = require('classes/Roboclaw.js');
const EventLoop = require('classes/EventLoop.js');

const eventLoop = new EventLoop(60);
eventLoop.start();

const rc = new Roboclaw('/dev/ttyS0', {
  baudRate: 38400,
  scaleFactor: 20305 / 360,
});

rc.on('open', () => {
  console.log('open!');

  const curve = new Curve(1000, [50, 48, 46, 44.5, 43.5, 43, 40, 38, 36, 32, 27, 24.5, 21, 17, 13.5, 11, 8, 3.5, -1, -3, -5, -6, -5, -3, -1, 0, 2, 6, 10, 14, 17, 21, 26, 30, 35, 38, 45, 48, 52, 55, 56.5, 57, 56, 55, 54, 53.5, 53, 52, 51, 50.5, 50]);
  curve.start();
});

rc.on('error', (err) => {
  console.log(err);
});

[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
  process.on(eventType, onExit.bind(null, eventType));
})

function onExit() {
  process.exit();
}

class Curve {
  constructor(duration, frames) {
    this.frames = frames;
    this.duration = duration;
    this.perFrameDuration = duration / frames.length;

    console.log('frames', frames.length);
  }

  start() {
    eventLoop.register(this);
    this.elapsed = 0;
    this.value = this.frames[0];
  }

  reset() {
    this.elapsed = 0;
    this.value = this.frames[0];
  }

  update(deltaTime) {
    const progess = (this.elapsed / this.duration);
    const index = Math.floor(progess * this.frames.length);


    const start = this.frames[index];
    const end = this.frames[index + 1];

    if(end === undefined)  {
      this.reset();
    }

    const frameProgress = (progess * this.frames.length) % 1;
    const value = start + ((end - start) * frameProgress);

    console.log(value);

    rc.goToPosition(1, value, 1000, 1000, 1000, 1);

    this.elapsed += deltaTime;
  }

  stop() {
    eventLoop.unregister(this);
  }
}
