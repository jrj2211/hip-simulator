const Curve = require('classes/Curve.js');
const path = require('path');
const fs = require('fs');

const eventLoop = require('classes/EventLoop.js');


class Simulation {
  constructor(rc, io) {
    this.duration = parseFloat(process.env.CYCLE_DURATION);
    this.profiles = {}
    this.running = false;
    this.elapsed = 0;
    this.rc = rc;
    this.io = io;

    this.addAxis('flexion', process.env.AXIS_FLEXION);
    this.addAxis('abduction', process.env.AXIS_ABDUCTION);
    this.addAxis('rotation', process.env.AXIS_ROTATION);
    this.addAxis('load', process.env.AXIS_LOAD);
  }

  addAxis(name, motor) {
    this.profiles[name] = {
      file: null,
      curve: new Curve(),
      motor
    }
  }

  start() {
    this.elapsed = 0;
    this.running = true;
    eventLoop.register(this);
  }

  stop() {
    this.running = false;
    eventLoop.unregister(this);

    for(let name in this.profiles) {
      this.io.to("frame").emit('axis.position', name, null);
    }

    for(let name in this.profiles) {
      const profile = this.profiles[name];
      this.rc.forward(profile.motor, 0);
    }
  }

  update(deltaTime) {
    const progress = ((this.elapsed % this.duration) / this.duration);

    const positions = {};

    for(let name in this.profiles) {
      const profile = this.profiles[name];
      const value = profile.curve.update(progress);

      if(value !== undefined || Number.isNaN(value) === false) {
        this.io.to("frame").emit('axis.position', name, progress, value);
        this.rc.goToPosition(profile.motor, value, 10000, 0, 0, 1);
      }
    }

    this.elapsed += deltaTime;
  }

  getProfile(name) {
    return this.profiles[name].file;
  }

  async setProfile(name, file) {
    const profile = this.profiles[name];

    if(profile.file != file) {
      profile.file = file;
      profile.curve.points = await this.getProfilePoints(name);
    }

    return profile.curve.points;
  }

  async getProfilePoints(name) {
    const file = this.profiles[name].file;

    if(file) {
      const filePath = path.join(process.cwd(), 'profiles', name, file);
      try {
        let file = await fs.promises.readFile(filePath, 'utf8');
        if(file) {
          file = file.replace(/(\r\n|\n|\r)/gm, '');
          const points = file.split(',');
          for(let i in points) {
            points[i] = parseFloat(points[i]);
          }
          this.profiles[name].points = points;
          return points;
        }
      } catch(error) {
        console.error('Couldnt load profile', error);
      }
    }
  }
}

module.exports = Simulation;
