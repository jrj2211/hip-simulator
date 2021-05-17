const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

class Logger extends EventEmitter {
  constructor(folder) {
    super();

    this.path = path.join(process.cwd(), folder);

    this.headers = [];
    this.reset();
  }

  setHeaders(headers) {
    this.headers = headers;
  }

  add(row) {
    this.data.push(row);
  }

  reset() {
    this.data = [];
  }

  async save() {
    const filename = moment().format('M-D-YYYY h-mm-ss a Z') + '.csv';
    await fs.promises.writeFile(path.join(this.path, filename), this.csv);
    this.reset();
    return filename;
  }

  get csv() {
    let csv = this.headers.join(',') + '\r\n';
    for(let row of this.data) {
      csv += row.join(',') + '\r\n';
    }
    return csv;
  }

  async getList() {
    return await fs.promises.readdir(this.path);
  }

  async delete(name) {
    return await fs.promises.unlink(path.join(this.path, name));
  }

  getFileStream(name) {
    return fs.createReadStream(path.join(this.path, name));
  }
}

module.exports = Logger;
