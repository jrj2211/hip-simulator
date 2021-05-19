# hip-simulator

[![Watch the video](https://img.youtube.com/vi/GWS1tOsrW-c/hqdefault.jpg)](https://youtu.be/GWS1tOsrW-c)


## Setup Instructions

1. Connect you your raspberry PI via SSH over Putty.
2. Run the following commands:

   `apt-get install git`
   
3. Checkout the hip simulator repository:

   `git clone https://github.com/jrj2211/hip-simulator`
   
4. Install pigio:

   `sudo apt-get install pigpio`
   
5. Change to the hip simulator directory:

   `cd hip-simulator`
   
6. Run the command to install node dependencies:

   `npm install`
   
7. Start the node server:

    `npm start`
    
8. In your web browser, go to your raspberry pi’s IP address. The interface should come up.

### Service

To make the system start on boot, create a service file: 

```
sudo nano /etc/systemd/system/hipsimulator.service
```

Paste the following:

```
[Unit]
Description=Hip simulator controller
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/pi/hip-simulator
ExecStart=/usr/bin/node /home/pi/hip-simulator/server.js

Environment=NODE_ENV=production
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable the service and start it
```
sudo systemctl enable hipsimulator
sudo systemctl start hipsimulator
```

### Calibration

To calibrate the rotary encoders, go to the web GUI. The values for each encoder is updated in real time so you can rotate them until they all read 0% at your home position.

To calibrate the load cell:

1. Remove all weight from the load cell
2. Copy the value from the GUI into loadcell.offset in the config.yaml
3. Place a known amount of weight on the load cell
4. Copy the value from the GUI
5. Using that value calculate the scale to convert to pounds

   `1 / (value / weight) = scale`
6. Choose number of decimal places to show in config.yaml
