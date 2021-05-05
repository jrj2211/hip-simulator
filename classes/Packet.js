class Packet extends DataView {
  constructor(length) {
    super(new ArrayBuffer(length));
  }

  get bytes() {
    return Buffer.from(this.updateCRC());
  }

  updateCRC() {
    let crc = 0;

    const bytes = new Uint8Array(this.buffer);

    // Loop through all data bytes and calculate crc
    for(let i = 0; i < bytes.length - 2; i++) {
      const byte = bytes[i];

      crc = crc ^ (byte << 8);

      for (let bit = 0; bit < 8; bit++) {
        if ((crc & 0x8000) === 0x8000) {
          crc = ((crc << 1) ^ 0x1021);
        } else {
          crc = crc << 1;
        }
      }
    }

    // Add the CRC
    this.setUint16(bytes.length - 2, crc & 0xFFFF);

    return bytes;
  }
}

module.exports = Packet;
