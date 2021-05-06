class Curve {
  constructor( points) {
    this.points = points;
  }

  update(progress) {
    if(Array.isArray(this.points)) {
      const frame = progress * (this.points.length - 1)
      const index = Math.floor(frame);

      const start = this.points[index];
      const end = this.points[index + 1];

      const frameProgress = frame % 1;
      const value = start + ((end - start) * frameProgress);

      this.value = value;

      return value;
    }
  }
}

module.exports = Curve;
