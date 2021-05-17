const Curve = require('classes/Curve.js');
const path = require('path');
const fs = require('fs');

const eventLoop = require('classes/EventLoop.js');


class Simulation {
  constructor(rc, io, loop) {
    this.data = {
      duration: parseInt(process.config.get('cycle_duration'))
    };
    this.profiles = {}
    this.running = false;
    this.elapsed = 0;
    this.rc = rc;
    this.io = io;
    this.loop = loop;

    this.addAxis(0);
    this.addAxis(1);
    this.addAxis(2);
    this.addAxis(3);
  }

  addAxis(motor) {
    const axes = process.config.get('axis');
    const params = axes[motor];
    params.scale_factor = params.gear_ratio * params.cpr * 4;

    this.profiles[motor] = {
      file: null,
      curve: new Curve(),
      params,
    }
  }

  start() {
    this.elapsed = 0;
    this.running = true;
    this.loop.register(this);
  }

  stop() {
    this.running = false;
    this.loop.unregister(this);

    for(let motor in this.profiles) {
      this.io.to("frame").emit('axis.position', motor, null);
      this.rc.forward(motor, 0);
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

    for(let motor in this.profiles) {
      const profile = this.profiles[motor];
      const motorPos = profile.curve.update(progress);

      if(motorPos !== undefined && Number.isNaN(motorPos) === false) {
        this.io.to("frame").emit('axis.position', motor, progress, motorPos);
        const params = this.getMotorParams(motor);

        this.rc.goToPosition(
          motor,
          motorPos * params.scale_factor,
          (params.speed / params.cpr) * params.scale_factor,
          (params.accel / params.cpr) * params.scale_factor,
          (params.decel / params.cpr) * params.scale_factor,
        );
      }
    }

    this.elapsed += deltaTime;
  }

  getMotorParams(motor) {
    return this.profiles[motor].params;
  }

  getProfile(motor) {
    return this.profiles[motor].file;
  }

  async setProfile(motor, file) {
    const profile = this.profiles[motor];

    if(profile.file != file) {
      profile.file = file;
      profile.curve.points = await this.getProfilePoints(motor);
    }

    return profile.curve.points;
  }

  async deleteProfile(motor, file) {
    const profile = this.profiles[motor];

    const filePath = path.join(process.cwd(), 'profiles', motor.toString(), file);
    await fs.promises.unlink(filePath);

    if(profile.file == file) {
      profile.file = null;
      return true;
    }
  }

  async getProfilePoints(motor) {
    const profile = this.profiles[motor];

    if(profile.file) {
      const filePath = path.join(process.cwd(), 'profiles', motor.toString(), profile.file);
      try {
        let file = await fs.promises.readFile(filePath, 'utf8');
        if(file) {
          file = file.replace(/(\r\n|\n|\r)/gm, '');
          const points = file.split(',');
          for(let i in points) {
            points[i] = parseFloat(points[i]);
          }
          return points;
        }
      } catch(error) {
        console.error('Couldnt load profile', error);
      }
    }
  }
}

module.exports = Simulation;
