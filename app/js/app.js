import 'css/standard.css';
import 'css/app.css';
import 'css/tooltip.css';

import '@fortawesome/fontawesome-free/js/fontawesome'
import '@fortawesome/fontawesome-free/js/solid'
import '@fortawesome/fontawesome-free/js/regular'

import AppContext from 'js/AppContext';

import { io } from "socket.io-client";
import AxisDisplay from 'components/AxisDisplay';

AppContext.socket = io(window.location.href);

AppContext.socket.on('connect', () => {
  document.querySelector('.footer .icon').setAttribute('color', 'green');
  document.querySelector('.footer .text').innerHTML = 'Connected';

  AppContext.socket.emit('cycle-duration.get', (duration) => {
    durationEl.value = duration;
  });

  AppContext.socket.emit('motion.running', setMotionButton);

  for(let name in axes) {
    axes[name].profileSelected();
  }
});

AppContext.socket.on('disconnect', () => {
  document.querySelector('.footer .icon').setAttribute('color', 'red');
  document.querySelector('.footer .text').innerHTML = 'Disconnected';

  setMotionButton(false);
});

document.body.innerHTML = `
  <div class='container '>
    <div class='controls'>
      <button name='motion' action='start'>Start</button>
      <button name='goToStart'>Go To Start</button>
      <div>
        <h2>Cycle Duration</h2>
        <div class='input-container' units='ms'>
          <input type='number' name='cycle-duration' />
        </div>
      </div>

      <div >
        <h2>Encoders</h2>
        <div class='encoders'>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>

      <div>
        <h2>Load Cell</h2>
        <div class='loadcell'>
          <div class='value'></div>
          <div class='copy'><i class="far fa-copy"></i></div>
        </div>
      </div>

      <div class='log-container expand'>
        <h2>Logs</h2>
        <div class='logs expand'>
          <div class='log-list'></div>
        </div>
      </div>

      <div class='footer'>
        <div class='icon'></div>
        <div class='text'>Pending...</div>
      </div>
    </div>
  </div>
`;

const container = document.body.querySelector('.container');

const axes = {
  'flexion': new AxisDisplay(0, 'Flexion', '#47BFF5'),
  'abduction': new AxisDisplay(1, 'Abduction', '#F54782'),
  'rotation': new AxisDisplay(2, 'Rotation', '#5EF547'),
  'load': new AxisDisplay(3, 'Load', '#F58247'),
};

for(let name in axes) {
  container.appendChild(axes[name]);
}

for(let name in axes) {
  axes[name].timeline.draw();
}

const durationEl = document.querySelector('input[name=cycle-duration]');
let durationTimeout = null;

AppContext.socket.on('axis.position', (motor, progress, position) => {
  motor = parseInt(motor, 10);

  for(let name in axes) {
    if(axes[name].motor === motor) {
      axes[name].timeline.setMarker(progress, position);
    }
  }
});

const encodersEl = document.querySelector('.encoders');
AppContext.socket.on('ads.values', (values, units) => {
  let html = '';

  for(let i in values) {
    html += `<div>${(values[i]).toFixed(1)}${units[i]}</div>`;
  }

  encodersEl.innerHTML = html;
});

const loadcellEl = document.querySelector('.loadcell .value');
let loadCell = 0;
AppContext.socket.on('loadcell.value', (value, units, decimals) => {
  loadcellEl.innerHTML = `${value.toFixed(decimals)} ${units}`;
  loadCell = value.toFixed(decimals);
});

document.querySelector('.loadcell').addEventListener('click', () => {
  var dummy = document.createElement("textarea");
  document.body.appendChild(dummy);
  dummy.value = loadCell;
  dummy.select();
  document.execCommand("copy");
  document.body.removeChild(dummy);

  // Update copy icon
  const svg = document.querySelector('.loadcell svg');
  svg.setAttribute('data-icon', 'check');
  svg.setAttribute('data-prefix', 'fas');
  setTimeout(() => {
    const svg = document.querySelector('.loadcell svg');
    svg.setAttribute('data-icon', 'copy');
    svg.setAttribute('data-prefix', 'far');
  }, 1500);
});

durationEl.addEventListener('keypress', setTypingTimeout);
durationEl.addEventListener('keyup', setTypingTimeout);

function setTypingTimeout(evt) {
  clearTimeout(durationTimeout);

  if(evt.keyCode === 13) {
    setDuration();
  } else {
    durationTimeout = setTimeout(setDuration, 500);
  }
}

function setDuration() {
  AppContext.socket.emit('cycle-duration.set', durationEl.value);
}

const motionButton = document.querySelector('button[name=motion]');
let isRunning = false;

motionButton.addEventListener('click', () => {
  setMotionButton(!isRunning);
  if(isRunning) {
    AppContext.socket.emit('motion.start');
  } else {
    AppContext.socket.emit('motion.stop');
  }
});

function setMotionButton(r) {
  isRunning = r;
  if(isRunning) {
    motionButton.innerHTML = 'Stop';
    motionButton.setAttribute('action', 'stop');
  } else {
    motionButton.innerHTML = 'Start';
    motionButton.setAttribute('action', 'start');
  }
}

const goToStartButton = document.querySelector('button[name=goToStart]');

goToStartButton.addEventListener('click', () => {
  AppContext.socket.emit('motion.goToStart');
});

const logListEl = document.querySelector('.log-list');
AppContext.socket.emit('logs.list', (list) => {
  for(let file of list) {
    logListEl.append(generateLog(file));
  }
});

AppContext.socket.on('logs.add', (name) => {
  console.log('here');
  logListEl.append(generateLog(name));
});


function generateLog(name) {
  const nameNoExt = name.replace(/\.[^/.]+$/, "");
  const template = document.createElement('template');
  template.innerHTML = `<div>
    <div>${nameNoExt}</div>
    <div action="delete"><i class="fas fa-trash" ></i></div>
    <div action="download"><i class="fas fa-file-download"></i></div>
  </div>`;

  const el = template.content.firstChild;

  el.querySelector('[action=delete]').addEventListener('click', () => {
    AppContext.socket.emit('logs.delete', name, () => {
      el.remove();
    })
  });
  el.querySelector('[action=download]').addEventListener('click', () => {
    window.open(`/api/logs/${name}`, '_blank');
  });
  return el;
}
