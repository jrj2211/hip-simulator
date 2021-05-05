import './timeline.css';

export default class Timeline extends HTMLElement {
  constructor(name, color = 0xFF0000) {
    super();

    this.name = name;
    this.color = color;
    this.padding = 25;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");

    this.data = [];

    this.innerHTML = `
      <h1>${this.name}</h1>
    `;

    this.appendChild(this.canvas);

    this.draw = this.draw.bind(this);
  }

  connectedCallback() {
    this.draw();
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
  }

  draw() {
    this.canvas.width = this.canvas.scrollWidth;
    this.canvas.height =  this.canvas.scrollHeight;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.beginPath();
    this.ctx.strokeStyle = `#${this.color.toString(16)}`;
    this.ctx.fillStyle = `#${this.color.toString(16)}`;
    this.ctx.lineWidth = 3;

    const spacing = this.canvas.width / (this.data.length - 1);

    if(this.data.length > 0) {
      const minY = Math.min(...this.data);
      const maxY = Math.max(...this.data);
      const yDiff = maxY - minY;
      const height = this.canvas.height - (this.padding * 2);

      const getX = (point) => {
        point -= minY;
        point /= yDiff;
        point = 1 - point;
        point *= height;
        point += this.padding;
        return point;
      }

      this.ctx.moveTo(0, getX(this.data[0]));

      for(let p in this.data) {
        const position = [spacing * p, getX(this.data[p])];
        this.ctx.lineTo(position[0], position[1]);
      }

      this.ctx.stroke();
    }
  }
}

window.customElements.define('motor-timeline', Timeline);
