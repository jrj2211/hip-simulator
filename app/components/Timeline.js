import './Timeline.css';

export default class Timeline extends HTMLElement {
  constructor(color = 0xFF0000) {
    super();

    this.color = color;
    this.paddingTop = 45;
    this.paddingBottom = 20;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.appendChild(this.canvas);

    this.draw = this.draw.bind(this);

    this.marker = null;
  }

  connectedCallback() {
    window.addEventListener('resize', this.draw);
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.draw);
  }

  set points(points) {
    this.data = points;
    if(this.isConnected) {
      this.draw();
    }

    this.setAttribute('has-data', this.data && this.data?.length > 0);
  }

  get padding() {
    return this.paddingTop + this.paddingBottom;
  }

  draw() {
    this.canvas.width = this.canvas.scrollWidth;
    this.canvas.height =  this.canvas.scrollHeight;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.beginPath();
    this.ctx.strokeStyle = this.color;
    this.ctx.fillStyle = this.color;
    this.ctx.lineWidth = 3;

    if(this.data && this.data.length > 0) {
      const spacing = this.canvas.width / (this.data.length - 1);
      const minY = Math.min(...this.data);
      const maxY = Math.max(...this.data);
      const yDiff = maxY - minY;
      const height = this.canvas.height - this.padding;

      const getX = (point) => {
        point -= minY;
        point /= yDiff;
        point = 1 - point;
        point *= height;
        point += this.paddingTop;
        return point;
      }

      this.ctx.moveTo(0, getX(this.data[0]));

      for(let p in this.data) {
        const position = [spacing * p, getX(this.data[p])];
        this.ctx.lineTo(position[0], position[1]);
      }

      this.ctx.stroke();

      if(this.marker) {
        const position = [this.canvas.scrollWidth * this.marker[0], getX(this.marker[1])];
        this.ctx.beginPath();
        this.ctx.fillStyle = '#ffffff';
        this.ctx.arc(position[0], position[1], 6, 0, 2 * Math.PI);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.fillStyle = this.color;
        this.ctx.arc(position[0], position[1], 4, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    }
  }

  setMarker(progress, value) {
    if(progress !== null && value !== null) {
      this.marker = [progress, value];
    } else {
      this.marker = null;
    }
    this.draw();
  }
}

window.customElements.define('motor-timeline', Timeline);
