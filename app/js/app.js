import 'css/standard.css';
import 'css/app.css';

import AppContext from 'js/AppContext';

import { io } from "socket.io-client";
import AxisDisplay from 'components/AxisDisplay';

AppContext.socket = io(window.location.href);

AppContext.socket.on('connect', () => {
  console.log('opened');
});

document.body.innerHTML = `
  <div class='container '>
    <div class='controls'>
      <button name='motion' action='start'>Start</button>
      <div>
        <h2>Cycle Duration</h2>
        <div class='input-container' units='ms'>
          <input type='text' name='cycle-duration' />
        </div>
      </div>

    </div>

  </div>

  <div class='estop'>
    E-STOP (SPACE)
  </div>
`;

const container = document.body.querySelector('.container');

const axes = {
  'abduction': new AxisDisplay('abduction', 'Abduction', '#47BFF5'),
  'flexion': new AxisDisplay('flexion', 'Flexion', '#F54782'),
  'rotation': new AxisDisplay('rotation', 'Rotation', '#5EF547'),
  'load': new AxisDisplay('load', 'Load', '#F58247'),
};

for(let name in axes) {
  container.appendChild(axes[name]);
}

for(let name in axes) {
  axes[name].timeline.draw();
}

const durationEl = document.querySelector('input[name=cycle-duration]');
let durationTimeout = null;

AppContext.socket.emit('cycle-duration.get', (duration) => {
  durationEl.value = duration;
});

durationEl.addEventListener('keypress', (evt) => {
  clearTimeout(durationTimeout);

  if(evt.keyCode === 13) {
    setDuration();
  } else {
    durationTimeout = setTimeout(setDuration, 500);
  }
});

function setDuration() {
  AppContext.socket.emit('cycle-duration.set', durationEl.value);

}
