const serialport = require('serialport');
const ByteLength = require('@serialport/parser-byte-length');
const Packet = require('classes/Packet');

const START_ADDRESS = 0x80;
const MAX_MOTORS = 16;

class Roboclaw extends serialport {
  constructor(port, options) {
    super(port, options);

    this.parser = this.pipe(new ByteLength({length: 1}));
    this.parser.on('data', this.onData.bind(this));
  }

  onData(bytes) {
    // Not doing anything with ACK
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
    ];

    const packet = new Packet(5);
    packet.setUint8(0, this.getMotorAddress(motor));
    packet.setUint8(1, this.getMotorCommand(motor, cmds));
    packet.setUint8(2, speed);
    this.write(packet.bytes);
  }

  goToPosition(motor, position, speed, accel, decel, buffer = 1) {
    const cmds = [
      Roboclaw.CMD.M1_POS_WITH_SPEED_ACCEL_DECEL,
      Roboclaw.CMD.M2_POS_WITH_SPEED_ACCEL_DECEL
    ];

    const packet = new Packet(21);
    packet.setUint8(0, this.getMotorAddress(motor));
    packet.setUint8(1, this.getMotorCommand(motor, cmds));
    packet.setInt32(2, Math.round(accel));
    packet.setInt32(6, Math.round(speed));
    packet.setInt32(10, Math.round(decel));
    packet.setInt32(14, Math.round(position / 360));
    packet.setUint8(18, buffer);
    this.write(packet.bytes);
  }

  setEncValue(motor, value = 0) {
    const cmds = [
      Roboclaw.CMD.M1_SET_ENC_VALUE,
      Roboclaw.CMD.M2_SET_ENC_VALUE
    ]

    const packet = new Packet(8);
    packet.setUint8(0, this.getMotorAddress(motor));
    packet.setUint8(1, this.getMotorCommand(motor, cmds));
    packet.setInt32(2, Math.round(value));
    this.write(packet.bytes);
  }

  resetEncValue(roboclaw) {
    const packet = new Packet(4);
    packet.setUint8(0, START_ADDRESS + roboclaw);
    packet.setUint8(1, Roboclaw.CMD.RESET_ENC_VALUE);
    packet.setInt32(2, Math.round(value));
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
  M1_POS_WITH_SPEED_ACCEL_DECEL: 65,
  M2_POS_WITH_SPEED_ACCEL_DECEL: 66,
  RESET_ENC_VALUE: 20,
  M1_SET_ENC_VALUE: 22,
  M2_SET_ENC_VALUE: 23,
};

module.exports = Roboclaw;
