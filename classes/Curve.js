const eventLoop = require('classes/EventLoop.js');

class Curve {
  constructor(rc, duration, frames) {
    this.frames = frames;
    this.duration = duration;
    this.rc = rc;
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
    const index = Math.floor(progess * (this.frames.length - 1));

    const start = this.frames[index];
    const end = this.frames[index + 1];

    if(end === undefined)  {
      this.elapsed = (this.elapsed + deltaTime) - this.duration;
      this.value = this.frames[0];
      return this.update(deltaTime);
    }

    const frameProgress = (progess * this.frames.length) % 1;
    const value = start + ((end - start) * frameProgress);

    this.rc.goToPosition(1, value, 1000, 1000, 1000, 1);

    this.elapsed += deltaTime;
  }

  stop() {
    eventLoop.unregister(this);
  }
}

module.exports = Curve;
