const Curve = require('classes/Curve.js');
const path = require('path');
const fs = require('fs');

const eventLoop = require('classes/EventLoop.js');


class Simulation {
  constructor(rc, io) {
    this.data = {
      duration: parseInt(process.config.get('cycle_duration'))
    };
    this.profiles = {}
    this.running = false;
    this.elapsed = 0;
    this.rc = rc;
    this.io = io;

    this.addAxis('flexion');
    this.addAxis('abduction');
    this.addAxis('rotation');
    this.addAxis('load');
  }

  addAxis(name) {
    this.profiles[name] = {
      file: null,
      curve: new Curve(),
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

  get duration() {
    return this.data.duration;
  }

  set duration(duration) {
    console.log('Setting Duration:', duration);
    process.config.set('cycle_duration', parseInt(duration, 10));
    this.data.duration = duration;
  }

  update(deltaTime) {
    const progress = ((this.elapsed % this.data.duration) / this.data.duration);

    const positions = {};

    const axes = process.config.get('axis');

    for(let name in this.profiles) {
      const profile = this.profiles[name];
      const motorPos = profile.curve.update(progress);
      const params = axes[name];

      if(motorPos !== undefined && Number.isNaN(motorPos) === false) {
        this.io.to("frame").emit('axis.position', name, progress, motorPos);
        const scale_factor = params.gear_ratio * params.cpr * 4;

        this.rc.goToPosition(params.channel,
          motorPos * scale_factor,
          (params.speed / params.cpr) * scale_factor,
          (params.accel / params.cpr) * scale_factor,
          (params.decel / params.cpr) * scale_factor,
        );
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

  async deleteProfile(name, file) {
    const profile = this.profiles[name];

    const filePath = path.join(process.cwd(), 'profiles', name, file);
    await fs.promises.unlink(filePath);

    if(profile.file == file) {
      profile.file = null;
      return true;
    }
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
