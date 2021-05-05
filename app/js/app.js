import 'css/standard.css';
import 'css/app.css';

import Timeline from 'components/timeline';

document.body.innerHTML = `

  <div class='controls'>
    <div class='list-select'>
      <div>Profile 1</div>
      <div>Profile 2</div>
      <div>Profile 3</div>
    </div>
  </div>
  <div class='graphs'></div>
`;

const graphEl = document.body.querySelector('.graphs');

const timelines = {
  'abduction': new Timeline('Abduction', 0x47BFF5),
  'flexion': new Timeline('Flexion', 0xF54782),
  'rotation': new Timeline('Rotation', 0x5EF547),
  'load': new Timeline('Load', 0xF58247),
};

for(let name in timelines) {
  graphEl.appendChild(timelines[name]);
}

for(let child of graphEl.childNodes) {
  child.draw();
}

timelines.abduction.points = [5.5, 5.7, 6, 6.5, 7, 7.5, 8, 8, 7.5, 7, 6, 5.5, 5, 4, 2.7, 1.2, 0, -1.5, -2, -2, -2, -1.5, -1.5, -1.5, -1.5, -1.6, -2, -3.5, -4.2, -6, -7, -7.8, -8.7, -9, -8.7, -7.8, -6.8, -6, -5.5, -3.7, -1.2, -0.5, 0, 1, 2, 2.4, 3, 3, 3.2, 4, 4.8];

timelines.flexion.points = [50, 48, 46, 44.5, 43.5, 43, 40, 38, 36, 32, 27, 24.5, 21, 17, 13.5, 11, 8, 3.5, -1, -3, -5, -6, -5, -3, -1, 0, 2, 6, 10, 14, 17, 21, 26, 30, 35, 38, 45, 48, 52, 55, 56.5, 57, 56, 55, 54, 53.5, 53, 52, 51, 50.5, 50];

timelines.rotation.points = [3, 3, 3, 3.2, 3.5, 3.4, 3.5, 3.4, 3.4, 3.1, 3.1, 3.1, 3.1, 2.7, 2.3, 2, 2, 1.7, 2.8, 3.1, 3.5, 4, 4.5, 5, 4.9, 4.9, 4.9, 4.9, 4.7, 5, 5.5, 6.5, 7.5, 9, 10, 11, 11, 10.5, 9, 8.5, 7.5, 7, 6, 4.5, 4, 3, 2.9, 2.8, 2.8, 2.8, 2.8];

timelines.load.points = [0.3, 0.4, 1, 1.4, 1.7, 2.15, 2.275, 2.45, 2.44, 2.4, 2.3, 2.2, 2, 1.55, 1.4, 1.25, 1, 0.8, 0.5, 0.35, 0.225, 0.1, 0.05, 0.01, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.15, 0.3];
