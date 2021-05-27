const EventEmitter = require('events');
const Curve = require('classes/Curve.js');
const path = require('path');
const fs = require('fs');

const eventLoop = require('classes/EventLoop.js');


class Simulation extends EventEmitter {
  constructor(rc, io, loop) {
    super();

    this.data = {
      duration: parseInt(process.config.get('cycle_duration'))
    };
    this.profiles = {}
    this.running = false;
    this.elapsed = 0;
    this.rc = rc;
    this.io = io;
    this.loop = loop;

    this.profilesPath = path.join(process.cwd(), 'profiles');

    this.addAxis(0);
    this.addAxis(1);
    this.addAxis(2);
    this.addAxis(3);
  }

  addAxis(motor) {
    const axes = process.config.get('axis');
    const params = axes[motor];
    params.scale_factor = params.gear_ratio * params.cpr * 4;

    fs.mkdir(path.join(this.profilesPath, motor.toString()), { recursive: true }, () => {
      console.log(`Initalized directory for motor ${motor} profiles`);
    });

    this.profiles[motor] = {
      file: null,
      curve: new Curve(),
      params,
      compensation: 0,
    }
  }

  start() {
    this.elapsed = 0;
    this.running = true;
    this.loop.register(this);

    this.emit('start');
  }

  stop() {
    this.elapsed = 0;
    this.running = false;
    this.loop.unregister(this);

    for(let motor in this.profiles) {
      this.io.to("frame").emit('axis.position', motor, null);
      this.rc.forward(motor, 0);
    }

    this.emit('stop');
  }

  goToStart() {
    this.elapsed = 0;
    this.running = false;
    this.update();
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
      let motorPos = profile.curve.update(progress);

      profile.rawMotorPos = motorPos;

      if(motorPos !== undefined && Number.isNaN(motorPos) === false) {
        this.io.to("frame").emit('axis.position', motor, progress, motorPos);
        const params = this.getMotorParams(motor);

        motorPos *= params.scale_factor;

        if(params.conversion) {
          motorPos *= params.conversion;
        }

        if(Number.isFinite(profile.position)) {
          profile.direction = motorPos - profile.position > 1 ? 0 : -1;
          profile.compensation = params.backlash * profile.direction;
        }

        this.rc.goToPosition(
          motor,
          motorPos + (profile.compensation || 0),
          (params.speed / params.cpr) * params.scale_factor,
          (params.accel / params.cpr) * params.scale_factor,
          (params.decel / params.cpr) * params.scale_factor,
        );

        profile.position = motorPos;
      }
    }

    this.elapsed += deltaTime;
  }

  backlashStartup(cb) {
    // Move each motor forward its backlash compensation
    for(let motor in this.profiles) {
      const params = this.getMotorParams(motor);

      this.rc.goToPosition(
        motor,
        params.backlash,
        (params.speed / params.cpr) * params.scale_factor * .5,
        (params.accel / params.cpr) * params.scale_factor * .5,
        (params.decel / params.cpr) * params.scale_factor * .5,
      );
    }

    setTimeout(cb, 500);
  }

  getMotorParams(motor) {
    return this.profiles[motor].params;
  }

  getProfile(motor) {
    return this.profiles[motor].file;
  }

  async getProfilesList(motor) {
    const dirPath = path.join(this.profilesPath, motor.toString());
    try {
      return await fs.promises.readdir(dirPath);
    } catch(error) {
      console.error(error);
      return [];
    }
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

    const filePath = path.join(this.profilesPath, motor.toString(), file);
    await fs.promises.unlink(filePath);

    if(profile.file == file) {
      profile.file = null;
      return true;
    }
  }

  async getProfilePoints(motor) {
    const profile = this.profiles[motor];

    if(profile.file) {
      const filePath = path.join(this.profilesPath, motor.toString(), profile.file);
      try {
        let file = await fs.promises.readFile(filePath, 'utf8');
        if(file) {
          file = file.replace(/(\r\n|\n|\r)/gm, '');
          const points = file.split('/\r?\n/');
          points = points.filter((val) => val != '');
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
