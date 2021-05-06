import './AxisDisplay.css';

import Timeline from 'components/Timeline';
import AppContext from 'js/AppContext';

const { socket } = AppContext;

export default class AxisDisplay extends HTMLElement {
  constructor(name, label, color) {
    super();

    this.name = name;

    this.timeline = new Timeline(color);

    this.innerHTML = `
      <div class='label' style='color:${color};'>${label}</div>
      <select>
        <option value=''>No Profile</option>
      </select>
    `;

    this.select = this.querySelector('select');

    this.prepend(this.timeline);
  }

  connectedCallback() {
    AppContext.socket.emit('profiles.list', this.name, (results) => {

      this.select.addEventListener('change', (evt) => {
        AppContext.socket.emit('axis.profile.set', this.name, this.select.value, (points) => {
          this.timeline.points = points;
        });
      });

      for(const file of results) {
        const option = document.createElement('option');
        option.value = file;
        option.innerHTML = file;
        this.select.append(option);
      }

      AppContext.socket.emit('axis.profile.get', this.name, (file) => {
        if(this.select.value != file) {
          this.select.value = file || "";
          this.select.dispatchEvent(new Event('change'));
        }
      });
    });
  }
}

window.customElements.define('axis-display', AxisDisplay);
