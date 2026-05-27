export class InputManager {
  #actions = {
    moveLeft: false,
    moveRight: false,
    jump: false,
    jumpHeld: false,
    restart: false,
    pause: false,
    start: false,
  };

  #touchStart = null;
  #axisCooldown = 0;
  #buttonMemory = new Map();

  constructor(canvas) {
    this.canvas = canvas;
    this.#bindKeyboard();
    this.#bindTouch();
  }

  consume(actionName) {
    const value = this.#actions[actionName];
    this.#actions[actionName] = false;
    return value;
  }

  isHeld(actionName) {
    return Boolean(this.#actions[actionName]);
  }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find(Boolean);
    if (!pad) return;

    if (this.#axisCooldown > 0) this.#axisCooldown--;
    const xAxis = pad.axes[0] ?? 0;
    if (this.#axisCooldown <= 0 && Math.abs(xAxis) > 0.55) {
      if (xAxis < 0) this.#actions.moveLeft = true;
      if (xAxis > 0) this.#actions.moveRight = true;
      this.#axisCooldown = 14;
    }

    this.#setButtonEdge('jump', pad.buttons[0]?.pressed || pad.buttons[12]?.pressed);
    this.#actions.jumpHeld = Boolean(pad.buttons[0]?.pressed || pad.buttons[12]?.pressed);
    this.#setButtonEdge('pause', pad.buttons[9]?.pressed);
    this.#setButtonEdge('restart', pad.buttons[8]?.pressed);
    this.#setButtonEdge('start', pad.buttons[0]?.pressed);
  }

  #setButtonEdge(actionName, pressed) {
    const wasPressed = this.#buttonMemory.get(actionName) ?? false;
    if (pressed && !wasPressed) this.#actions[actionName] = true;
    this.#buttonMemory.set(actionName, Boolean(pressed));
  }

  #bindKeyboard() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          event.preventDefault();
          this.#actions.moveLeft = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          event.preventDefault();
          this.#actions.moveRight = true;
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          event.preventDefault();
          this.#actions.jump = true;
          this.#actions.jumpHeld = true;
          this.#actions.start = true;
          break;
        case 'KeyR':
          this.#actions.restart = true;
          break;
      }
    });

    window.addEventListener('keyup', (event) => {
      if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'Space') {
        this.#actions.jumpHeld = false;
      }
    });
  }

  #bindTouch() {
    this.canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      this.#touchStart = { x: touch.clientX, y: touch.clientY, time: performance.now() };
    }, { passive: false });

    this.canvas.addEventListener('touchend', (event) => {
      event.preventDefault();
      if (!this.#touchStart) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - this.#touchStart.x;
      const dy = touch.clientY - this.#touchStart.y;
      const dt = performance.now() - this.#touchStart.time;

      if (dt < 700) {
        if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy)) {
          this.#actions[dx > 0 ? 'moveRight' : 'moveLeft'] = true;
        } else if (-dy > 34) {
          this.#actions.jump = true;
          this.#actions.start = true;
        } else if (Math.abs(dx) < 24 && Math.abs(dy) < 24) {
          this.#actions.jump = true;
          this.#actions.start = true;
        }
      }

      this.#touchStart = null;
      this.#actions.jumpHeld = false;
    }, { passive: false });
  }
}
