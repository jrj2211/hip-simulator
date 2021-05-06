const serialport = require('serialport');
const ByteLength = require('@serialport/parser-byte-length');
const Packet = require('classes/Packet');

const START_ADDRESS = 0x80;
const MAX_MOTORS = 16;

class Roboclaw extends serialport {
  constructor(port, options) {
    super(port, options);

    this.scaleFactor = options.scaleFactor || 1;

    this.parser = this.pipe(new ByteLength({length: 1}));
    this.parser.on('data', this.onData.bind(this));
  }

  onData(bytes) {

  }

  updateCrc(data) {
		this.crcRaw = this.crcRaw ^ (data << 8);

    for (let bit = 0; bit < 8; bit++) {
      if ((this.crcRaw & 0x8000) === 0x8000) {
        this.crcRaw = ((this.crcRaw << 1) ^ 0x1021);
      } else {
        this.crcRaw = this.crcRaw << 1;
      }
    }
  }

  resetCrc() {
    this.crcRaw = 0;
  }

  forward(motor, speed) {
    const cmds = [
      Roboclaw.CMD.M1_FORWARD,
      Roboclaw.CMD.M2_FORWARD
    ]

    const packet = new Packet(5);
    packet.setUint8(0, this.getMotorAddress(motor));
    packet.setUint8(1, this.getMotorCommand(motor, cmds));
    packet.setUint8(2, speed);

    this.write(packet.bytes);
  }

  goToPosition(motor, position, speed, accel, decel, buffer) {
    const packet = new Packet(21);
    packet.setUint8(0, this.getMotorAddress(motor));
    packet.setUint8(1, Roboclaw.CMD.M1_POS_WITH_SPEED_ACCEL_DECEL);
    packet.setInt32(2, accel * this.scaleFactor);
    packet.setInt32(6, speed * this.scaleFactor);
    packet.setInt32(10, decel * this.scaleFactor);
    packet.setInt32(14, position * this.scaleFactor);
    packet.setUint8(18, buffer);

    this.write(packet.bytes);
  }

  getMotorAddress(motor) {
    // Take 1-16 and convert to roboclaw address
    if(motor > MAX_MOTORS || motor < 0) {
      throw new Error(`Invalid motor number (1-${MAX_MOTORS})`);
    }
    return START_ADDRESS + Math.floor((motor - 1) / 2);
  }

  getMotorNumber(motor) {
    // Take 1-16 and convert to motor 1/2
    return ((motor - 1) % 2) + 1;
  }

  getMotorCommand(motor, commands) {
    return commands[this.getMotorNumber(motor) - 1];
  }
}

Roboclaw.CMD = {
  // Simple
  M1_FORWARD: 0,
  M1_BACKWARD: 1,
  VOLT_MIN: 2,
  VOLT_MAX: 3,
  M2_FORWARD: 4,
  M2_BACKWARD: 5,
  M1_DRIVE: 6,
  M2_DRIVE: 7,
  DRIVE_FORWARD: 8,
  DRIVE_BACKWARD: 9,
  TURN_RIGHT: 10,
  TURN_LEFT: 11,
  DRIVE: 12,
  TURN: 13,

  // Advanced
  M1_POS_WITH_SPEED_ACCEL_DECEL: 65
};

module.exports = Roboclaw;
