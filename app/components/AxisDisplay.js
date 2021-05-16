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
      <div class='bottom'>
        <select>
          <option value=''>No Profile</option>
        </select>
        <button name='delete' tooltip='Delete selected profile' bottom><i class='fas fa-trash'></i></button>
        <label name='upload' tooltip='Upload Profile' bottom>
            <i class='fas fa-upload'></i>
            <input type='file' name='profile' accept='.csv, .txt'>
        </label>
      </div>
    `;

    this.select = this.querySelector('select');
    this.profileInput = this.querySelector('input[name=profile]');
    this.deleteButton = this.querySelector('button[name=delete]');

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
        this.addProfile(file);
      }

      AppContext.socket.emit('axis.profile.get', this.name, (file) => {
        if(this.select.value != file) {
          this.select.value = file || "";
          this.select.dispatchEvent(new Event('change'));
        }
      });
    });

    this.profileInput.addEventListener('change', () => {
      if(this.profileInput.files.length > 0) {
        var formData = new FormData();
        formData.append('file', this.profileInput.files[0]);

        const button = this.querySelector('label[name=upload] svg');
        button.setAttribute('data-icon', 'spinner');
        button.classList.add('fa-spin');

        $.ajax({
           url : `api/profiles/${this.name}/upload`,
           type : 'POST',
           data : formData,
           processData: false,  // tell jQuery not to process the data
           contentType: false,  // tell jQuery not to set contentType
        }).done((data) => {
          if(data.error !== false) {
            alert('Failed to upload.');
          } else {
            this.addProfile(this.profileInput.files[0].name);
            this.select.value = this.profileInput.files[0].name;
            this.select.dispatchEvent(new Event('change'));
          }
        }).always(() => {
          this.profileInput.value = '';
            const button = this.querySelector('label[name=upload] svg');
            button.setAttribute('data-icon', 'upload');
            button.classList.remove('fa-spin');
        });
      }
    });

    this.deleteButton.addEventListener('click', () => {
      if(this.select.value) {
        const file = this.select.value;
        AppContext.socket.emit('axis.profile.delete', this.name, file, (results) => {
          if(results === true) {
            this.select.querySelector(`[value='${file}']`).remove();
            this.profileSelected();
          }
        });
      }
    });
  }

  addProfile(file) {
    const exists = this.select.querySelector(`[value='${file}']`);
    if(!exists) {
      const option = document.createElement('option');
      option.value = file;
      option.innerHTML = file;
      this.select.append(option);
    }
  }

  profileSelected() {
    this.select.dispatchEvent(new Event('change'));
  }
}

window.customElements.define('axis-display', AxisDisplay);
