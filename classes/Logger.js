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
    // Specify the headers for the log file
    this.headers = headers;
  }

  add(row) {
    // Add a data point
    this.data.push(row);
  }

  reset() {
    this.data = [];
  }

  async save() {
    // Create the log folder if it doesnt exist
    fs.mkdirSync(this.path, { recursive: true })

    // Write the file
    const filename = moment().format('M-D-YYYY h-mm-ss a Z') + '.csv';
    await fs.promises.writeFile(path.join(this.path, filename), this.csv);

    // Prepare for next log
    this.reset();
    return filename;
  }

  get csv() {
    // Convert headers and data to CSV file
    let csv = this.headers.join(',') + '\r\n';
    for(let row of this.data) {
      csv += row.join(',') + '\r\n';
    }
    return csv;
  }

  async getList() {
    // Get all log files
    return await fs.promises.readdir(this.path);
  }

  async delete(name) {
    // Delete a log file by name
    return await fs.promises.unlink(path.join(this.path, name));
  }

  getFileStream(name) {
    // Get a read stream for log file by name
    return fs.createReadStream(path.join(this.path, name));
  }
}

module.exports = Logger;
