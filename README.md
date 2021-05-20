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

5. Enable I2C in the interface section of raspi config:

   `sudo raspi-config`
   
6. Change to the hip simulator directory:

   `cd hip-simulator`
   
7. Run the command to install node dependencies:

   `npm install`
   
8. Start the node server:

    `npm start`
    
9. In your web browser, go to your raspberry pi’s IP address. The interface should come up.

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


## Wiring Documentation

![image](https://user-images.githubusercontent.com/6005836/118934807-9facb800-b8ff-11eb-8480-3f085804fcc0.png)


1. Roboclaw Wiring

In packet serial mode up to eight Roboclaw units can be controlled from a single serial port.
The wiring diagram below illustrates how this is done. Each Roboclaw must have multi-unit
mode enabled and have a unique packet serial address set. This can be configured using Motion
Studio. Wire the S1 and S2 pins directly to the MCU TX and RX pins. Install a pull-up resistor
(R1) on the MCU RX pin. A 1K to 4.7K resistor value is recommended. For model specific pinout
information please refer to the data sheet for the model being used.

![image](https://user-images.githubusercontent.com/6005836/118936032-02eb1a00-b901-11eb-8f52-f4ff420b87d3.png)

![image](https://user-images.githubusercontent.com/6005836/118936958-e1d6f900-b901-11eb-8e7e-3194bf1c61b1.png)

![image](https://user-images.githubusercontent.com/6005836/118934712-81df5300-b8ff-11eb-8e24-ee594ea3f68a.png)

2. ADS115 Wiring

![image](https://user-images.githubusercontent.com/6005836/118934851-ae936a80-b8ff-11eb-82e4-4a669a4d3876.png)

3. HX711 Wiring

![image](https://user-images.githubusercontent.com/6005836/118934891-bb17c300-b8ff-11eb-8c3f-f2cf5466de03.png)

