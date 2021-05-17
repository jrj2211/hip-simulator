const EventEmitter = require('events');
const ADS1115 = require('ads1115');
const i2c = require('i2c-bus');

class AnalogToDigital extends EventEmitter {
  constructor() {
    super();

    i2c.openPromisified(1).then(async (bus) => {
      this.ads1115 = await ADS1115(bus);
      this.ads1115.gain = process.config.get('ads_gain');
      this.connected = true;
    });

    this.values = [0,0,0,0];

    this.range = (process.config.get('ads_range') * 32768);

    this.numSamples = 10;
    this.samples = [];
  }

  async update() {
    if(this.connected) {
      this.values[0] = await this.ads1115.measure('0+GND') / this.range;
      this.values[1] = await this.ads1115.measure('1+GND') / this.range;
      this.values[2] = await this.ads1115.measure('2+GND') / this.range;

      if(this.initalized !== true) {
        if(this.numSamples > this.samples.length) {
          this.samples.push([...this.values]);
        } else {
          let averages = [0,0,0,0];

          for(let sample of this.samples) {
            for(let channel = 0; channel < this.values.length; channel++) {
              averages[channel] += sample[channel];
            }
          }

          for(let i in averages) {
            averages[i] = averages[i] / this.samples.length;
          }

          this.emit('averages', averages);

          this.initalized = true;
        }
      }

      this.emit('update', this.values);
    }
  }
}

module.exports = AnalogToDigital;
