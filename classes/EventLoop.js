const { performance } = require('perf_hooks');

/**
 * Class for keeping track of which objects should be updated every frame.
 * Objects can register for earlyUpdate
 */
class EventLoop {
  /**
   * Creates a new event loop and starts it if autoStart is true.
   * The event loop can be manually started and stopped if needed.
   *
   * @param {number} targetFPS - desired max FPS to run loop at
   * @param {number} tolerance - allow frames that run slightly before
   */
  constructor(targetFPS = 60) {
    this.objects = [];
    this.active = false;
    this.targetFPS = targetFPS;
    this.timer = null;
    this.start();
  }

  get interval() {
    return Math.floor(1000 / this.targetFPS);
  }

  /**
   * Starts running the event loop every frame
   */
  start() {
    if (this.timer === null) {
      this.lastUpdate = performance.now();
      this.timer = setInterval(this.update.bind(this), this.interval);
    }
  }

  /**
   * Stops running the event loop every frame
   */
  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Adds a new object to run every frame. This can either be an object or
   * function. If its an object it can define earlyUpdate, update or lateUpdate.
   * If its a function, it will be treated as the update function.
   *
   * @param {object|Function} obj - object or function to run update on
   */
  register(obj) {
    if (this.objects.includes(obj) === false) {
      this.objects.push(obj);
    }
  }

  /**
   * Removes the object from being called every frame
   *
   * @param {object|Function} obj - object or function to remove from event loop
   */
  unregister(obj) {
    this.objects = this.objects.filter((stored) => stored !== obj);
  }

  /**
   * Run the update functions for any objects that have registered one.
   * The order of execution is earlyUpdate -> update -> lateUpdate
   */
  update() {
    const now = performance.now();
    const deltaTime = now - this.lastUpdate;
    this.lastUpdate = now;

    for (const obj of this.objects) {
      if (obj.earlyUpdate && typeof obj.earlyUpdate === 'function') {
        obj.earlyUpdate(deltaTime);
      }
    }

    // Run the update if defined for each object
    for (const obj of this.objects) {
      if (obj.update && typeof obj.update === 'function') {
        obj.update(deltaTime);
      } else if (typeof obj === 'function') {
        obj(deltaTime);
      }
    }

    // Run the lateUpdate if defined for each object
    for (const obj of this.objects) {
      if (typeof obj.lateUpdate === 'function') {
        obj.lateUpdate(deltaTime);
      }
    }
  }
}

module.exports = EventLoop;
