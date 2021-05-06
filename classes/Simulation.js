const Curve = require('classes/Curve.js');
const path = require('path');
const fs = require('fs');

class Simulation {
  constructor() {
    this.duration = 1000;
    this.profiles = {}
    this.running = false;

    this.addAxis('flexion');
    this.addAxis('rotation');
    this.addAxis('abduction');
    this.addAxis('load');
  }

  addAxis(name) {
    this.profiles[name] = {
      file: null,
      curve: new Curve(),
    }
  }

  update() {

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
