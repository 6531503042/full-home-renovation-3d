/**
 * CDP Browser Automation Client for E2E Testing
 *
 * Pure Node.js Chrome DevTools Protocol implementation using native
 * fetch and WebSocket. Zero external npm dependencies.
 */

const cp = require('child_process');
const os = require('os');
const fs = require('fs');

class CDPClient {
  constructor(options = {}) {
    this.chromePath = options.chromePath || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    this.port = options.port || 9228;
    this.width = options.width || 1920;
    this.height = options.height || 1080;
    this.url = options.url || 'http://localhost:8788/';
    this.chromeProc = null;
    this.tmpDir = null;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
    this.spawnError = null;
  }

  cancelPending(error) {
    for (const [, cb] of this.callbacks) {
      try { cb.reject(error); } catch (e) {}
    }
    this.callbacks.clear();
  }

  isAlive() {
    return Boolean(
      this.chromeProc &&
      this.chromeProc.exitCode === null &&
      !this.chromeProc.killed &&
      this.ws &&
      this.ws.readyState === 1 /* WebSocket.OPEN */
    );
  }

  async launch() {
    this.tmpDir = `${os.tmpdir()}/chrome_e2e_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    fs.mkdirSync(this.tmpDir, { recursive: true });

    // Launch Chrome with WebGL enabled, without disabling GPU
    const args = [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${this.tmpDir}`,
      '--enable-webgl',
      `--window-size=${this.width},${this.height}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--mute-audio',
      '--disable-background-networking',
      'about:blank'
    ];

    this.spawnError = null;
    this.chromeProc = cp.spawn(this.chromePath, args, { stdio: 'ignore' });
    this.chromeProc.on('error', (err) => {
      this.spawnError = err;
    });

    // Poll for CDP readiness (100 iterations of 100ms = 10.0 seconds)
    let connected = false;
    for (let i = 0; i < 100; i++) {
      if (this.spawnError) {
        throw new Error(`Chrome failed to spawn: ${this.spawnError.message}`);
      }
      if (this.chromeProc.exitCode !== null) {
        throw new Error(`Chrome exited prematurely with code ${this.chromeProc.exitCode}`);
      }

      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json`);
        if (res.ok) {
          connected = true;
          break;
        }
      } catch (err) {
        // waiting for chrome to listen
      }
      await new Promise(r => setTimeout(r, 100));
    }

    if (!connected) {
      throw new Error(`Failed to connect to Chrome on port ${this.port} within 10000ms timeout`);
    }

    const res = await fetch(`http://127.0.0.1:${this.port}/json`);
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page') || pages[0];
    if (!page || !page.webSocketDebuggerUrl) {
      throw new Error('No inspectable page found in Chrome target list');
    }

    // Connect WebSocket
    this.ws = new WebSocket(page.webSocketDebuggerUrl);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        } else if (msg.method) {
          const listeners = this.eventListeners.get(msg.method) || [];
          listeners.forEach(fn => fn(msg.params));
        }
      } catch (err) {
        console.error('CDP Message Parse Error:', err);
      }
    };

    await new Promise((resolve, reject) => {
      const openHandler = () => {
        cleanup();
        resolve();
      };
      const errorHandler = (err) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        if (this.ws) {
          this.ws.removeEventListener('open', openHandler);
          this.ws.removeEventListener('error', errorHandler);
        }
      };
      this.ws.addEventListener('open', openHandler);
      this.ws.addEventListener('error', errorHandler);
    });

    // Persistent WebSocket close and error handlers
    this.ws.onclose = (event) => {
      const reason = new Error(`CDP WebSocket closed (code=${event.code}, reason=${event.reason || 'none'})`);
      this.cancelPending(reason);
    };

    this.ws.onerror = (err) => {
      const msg = err && err.message ? err.message : 'unknown';
      this.cancelPending(new Error(`CDP WebSocket error: ${msg}`));
    };

    // Initialize CDP domains
    await this.send('Runtime.enable');
    await this.send('Page.enable');
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: this.width,
      height: this.height,
      deviceScaleFactor: 1,
      mobile: false
    });

    // Navigate to target URL
    await this.navigate(this.url);
  }

  async recoverSession() {
    this.cancelPending(new Error('Session recovery initiated due to timeout'));
    if (this.isAlive()) {
      try {
        await Promise.race([
          this.navigate(this.url),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation recovery timed out')), 4000))
        ]);
        return;
      } catch (e) {
        // Soft recovery via navigate failed; fall through to full restart
      }
    }
    await this.reinitialize();
  }

  async reinitialize() {
    await this.close();
    await this.launch();
  }

  async navigate(url) {
    const navPromise = new Promise((resolve) => {
      const handler = () => {
        this.removeListener('Page.loadEventFired', handler);
        resolve();
      };
      this.on('Page.loadEventFired', handler);
      // Fallback timeout
      setTimeout(resolve, 6000);
    });

    await this.send('Page.navigate', { url });
    await navPromise;

    // Poll until DOM and Three.js application are fully initialized
    for (let i = 0; i < 40; i++) {
      try {
        const ready = await this.eval('document.readyState !== "loading" && typeof scene !== "undefined"');
        if (ready) break;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 100));
    }

    // Allow Three.js scene and shaders to compile and start render loop
    await new Promise(r => setTimeout(r, 1000));
  }

  on(event, fn) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(fn);
  }

  removeListener(event, fn) {
    if (this.eventListeners.has(event)) {
      const arr = this.eventListeners.get(event).filter(f => f !== fn);
      this.eventListeners.set(event, arr);
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== 1 /* WebSocket.OPEN */) {
        return reject(new Error(`Cannot send CDP command '${method}': WebSocket is not open (readyState=${this.ws ? this.ws.readyState : 'null'})`));
      }
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        this.callbacks.delete(id);
        reject(err);
      }
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception ? (res.exceptionDetails.exception.description || res.exceptionDetails.exception.value) : res.exceptionDetails.text;
      throw new Error(`EvalException: ${desc}`);
    }
    return res.result ? res.result.value : res;
  }

  async click(x, y, button = 'left') {
    const btnVal = button === 'right' ? 'right' : (button === 'middle' ? 'middle' : 'left');
    const buttonsMask = button === 'right' ? 2 : (button === 'middle' ? 4 : 1);
    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: btnVal,
      buttons: buttonsMask,
      clickCount: 1
    });
    await new Promise(r => setTimeout(r, 20));
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: btnVal,
      buttons: 0
    });
  }

  async drag(startX, startY, endX, endY, button = 'left', steps = 8, stepDelay = 15) {
    const btnVal = button === 'right' ? 'right' : (button === 'middle' ? 'middle' : 'left');
    const buttonsMask = button === 'right' ? 2 : (button === 'middle' ? 4 : 1);

    await this.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: startX,
      y: startY,
      button: btnVal,
      buttons: buttonsMask,
      clickCount: 1
    });

    for (let i = 1; i <= steps; i++) {
      const curX = Math.round(startX + (endX - startX) * (i / steps));
      const curY = Math.round(startY + (endY - startY) * (i / steps));
      await this.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: curX,
        y: curY,
        button: btnVal,
        buttons: buttonsMask
      });
      await new Promise(r => setTimeout(r, stepDelay));
    }

    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: endX,
      y: endY,
      button: btnVal,
      buttons: 0
    });
    await new Promise(r => setTimeout(r, 50));
  }

  async wheel(x, y, deltaX, deltaY) {
    await this.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x,
      y,
      deltaX,
      deltaY
    });
    await new Promise(r => setTimeout(r, 60));
  }

  async resetCamera() {
    await this.eval(`(() => {
      try {
        if (typeof isFlying !== 'undefined') isFlying = false;
      } catch (e) {}
      try {
        window.isFlying = false;
      } catch (e) {}
      try {
        if (typeof controls !== 'undefined' && controls && typeof camera !== 'undefined' && camera) {
          controls.target.set(1.40, 1.10, 0.60);
          camera.position.set(5.80, 5.20, 7.80);
          camera.lookAt(1.40, 1.10, 0.60);
          if (typeof targetCamPos !== 'undefined') targetCamPos.copy(camera.position);
          if (typeof targetLookAt !== 'undefined') targetLookAt.copy(controls.target);
          const prevDamping = controls.enableDamping;
          controls.enableDamping = false;
          controls.update();
          controls.enableDamping = prevDamping;
        }
      } catch (e) {}
    })()`);
    await new Promise(r => setTimeout(r, 50));
  }

  async close() {
    // 1. Close WebSocket and cancel pending promises
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this.cancelPending(new Error('CDPClient closed'));

    // 2. Wait for Chrome process to terminate completely
    if (this.chromeProc && this.chromeProc.exitCode === null) {
      await new Promise((resolve) => {
        let finished = false;
        const killTimer = setTimeout(() => {
          if (!finished && this.chromeProc && this.chromeProc.exitCode === null) {
            try { this.chromeProc.kill('SIGKILL'); } catch (e) {}
          }
          setTimeout(resolve, 300);
        }, 2000);

        this.chromeProc.once('exit', () => {
          finished = true;
          clearTimeout(killTimer);
          resolve();
        });

        try {
          this.chromeProc.kill('SIGTERM');
        } catch (e) {
          clearTimeout(killTimer);
          resolve();
        }
      });
    }
    this.chromeProc = null;

    // 3. Delete temporary profile directory with retries after process has released all file locks
    if (this.tmpDir && fs.existsSync(this.tmpDir)) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          fs.rmSync(this.tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          if (!fs.existsSync(this.tmpDir)) break;
        } catch (e) {
          if (attempt < 4) {
            await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
          }
        }
      }
      this.tmpDir = null;
    }
  }
}

module.exports = { CDPClient };
