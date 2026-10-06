/**
 * CTUT School Scene - Master Orchestrator
 * Automatic 10-second crossfade cycle: Sáng ➔ Chiều ➔ Tối
 * Animated multi-lane vehicle traffic with realistic street physics
 */

import { TrafficSimulator } from '../../components/client/TrafficSimulator.js';
import { SkyAtmosphere } from '../../components/client/SkyAtmosphere.js';

class App {
  constructor() {
    this.appEl = document.getElementById('app');
    this.viewportEl = document.getElementById('scene-viewport');
    this.wrapperEl = document.querySelector('.building-wrapper');

    this.imgSang = document.getElementById('img-sang');
    this.imgChieu = document.getElementById('img-chieu');
    this.imgToi = document.getElementById('img-toi');

    this.trafficCanvas = document.getElementById('traffic-canvas');
    this.skyCanvas = document.getElementById('sky-canvas');

    this.timeIcon = document.getElementById('time-icon');
    this.timeLabel = document.getElementById('time-label');
    this.progressFill = document.getElementById('time-progress-fill');

    // Systems
    this.traffic = new TrafficSimulator(this.trafficCanvas);
    this.sky = new SkyAtmosphere(this.skyCanvas);

    this.lastTime = performance.now();
    this.elapsedCycleTime = 0; // seconds into the 30s cycle
    this.phaseDuration = 10.0; // 10s per phase (Sáng, Chiều, Tối)
    this.cycleDuration = 30.0; // 3 phases = 30s

    this.init();
  }

  init() {
    this.initCanvasResizing();
    this.initKeyboardShortcuts();
    this.handleResize();

    // Start render loop
    requestAnimationFrame((t) => this.renderLoop(t));
  }

  initCanvasResizing() {
    const onResize = () => this.handleResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const wrapW = this.wrapperEl.clientWidth;
    const wrapH = this.wrapperEl.clientHeight;

    // Sky canvas fills the viewport behind the building scene.
    this.skyCanvas.width = this.skyCanvas.clientWidth;
    this.skyCanvas.height = this.skyCanvas.clientHeight;

    // Traffic canvas sizing
    this.trafficCanvas.width = wrapW * dpr;
    this.trafficCanvas.height = wrapH * dpr;
    this.trafficCanvas.style.width = `${wrapW}px`;
    this.trafficCanvas.style.height = `${wrapH}px`;
    const tCtx = this.trafficCanvas.getContext('2d');
    tCtx.resetTransform();
    tCtx.scale(dpr, dpr);
  }

  getRoadPositions() {
    const { width, height } = this.wrapperEl.getBoundingClientRect();
    const imageWidth = this.imgSang.naturalWidth || 1672;
    const imageHeight = this.imgSang.naturalHeight || 941;

    // Match the centered `object-fit: cover` image crop so the traffic lanes
    // stay anchored to the same road pixels at every box size/aspect ratio.
    const scale = Math.max(width / imageWidth, height / imageHeight);
    const renderedHeight = imageHeight * scale;
    const imageOffsetY = (height - renderedHeight) / 2;

    return {
      roadY1: imageOffsetY + renderedHeight * 0.865,
      roadY2: imageOffsetY + renderedHeight * 0.945,
    };
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'h') {
        this.appEl.classList.toggle('pill-hidden');
      } else if (e.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    });

    // Double-click anywhere to toggle fullscreen
    this.appEl.addEventListener('dblclick', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  /**
   * Compute smooth crossfade weights for Sáng, Chiều, Tối
   * Each phase takes 10s:
   * - 0s - 10s: Sáng (7.5s hold, 2.5s crossfade to Chiều)
   * - 10s - 20s: Chiều (7.5s hold, 2.5s crossfade to Tối)
   * - 20s - 30s: Tối (7.5s hold, 2.5s crossfade to Sáng)
   */
  computeWeights(t) {
    const crossfade = 2.5; // 2.5s smooth blend
    let wSang = 0;
    let wChieu = 0;
    let wToi = 0;

    if (t < 10.0) {
      if (t < 10.0 - crossfade) {
        wSang = 1.0;
      } else {
        const p = (t - (10.0 - crossfade)) / crossfade;
        const ease = (1 - Math.cos(p * Math.PI)) / 2;
        wSang = 1.0 - ease;
        wChieu = ease;
      }
    } else if (t < 20.0) {
      const localT = t - 10.0;
      if (localT < 10.0 - crossfade) {
        wChieu = 1.0;
      } else {
        const p = (localT - (10.0 - crossfade)) / crossfade;
        const ease = (1 - Math.cos(p * Math.PI)) / 2;
        wChieu = 1.0 - ease;
        wToi = ease;
      }
    } else {
      const localT = t - 20.0;
      if (localT < 10.0 - crossfade) {
        wToi = 1.0;
      } else {
        const p = (localT - (10.0 - crossfade)) / crossfade;
        const ease = (1 - Math.cos(p * Math.PI)) / 2;
        wToi = 1.0 - ease;
        wSang = ease;
      }
    }

    return { wSang, wChieu, wToi };
  }

  renderLoop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) * 0.001, 0.1);
    this.lastTime = timestamp;

    // Advance 30-second cycle
    this.elapsedCycleTime = (this.elapsedCycleTime + dt) % this.cycleDuration;
    const t = this.elapsedCycleTime;

    // 1. Calculate weights
    const { wSang, wChieu, wToi } = this.computeWeights(t);

    // Animate the procedural sky along with the scene phase.
    const skyMode = wToi > 0.5 ? 'night' : wChieu > 0.5 ? 'sunset' : 'day';
    this.sky.setMode(skyMode);
    this.sky.update(dt);
    this.sky.render();

    // Apply opacities to scene images
    this.imgSang.style.opacity = wSang.toFixed(3);
    this.imgChieu.style.opacity = wChieu.toFixed(3);
    this.imgToi.style.opacity = wToi.toFixed(3);

    // Update ambient background
    if (wToi > 0.5) {
      this.appEl.className = 'phase-toi';
      if (this.timeIcon) this.timeIcon.textContent = '🌙';
      if (this.timeLabel) this.timeLabel.textContent = 'Ban Đêm';
    } else if (wChieu > 0.5) {
      this.appEl.className = 'phase-chieu';
      if (this.timeIcon) this.timeIcon.textContent = '🌅';
      if (this.timeLabel) this.timeLabel.textContent = 'Chiều Hoàng Hôn';
    } else {
      this.appEl.className = 'phase-sang';
      if (this.timeIcon) this.timeIcon.textContent = '☀️';
      if (this.timeLabel) this.timeLabel.textContent = 'Ban Sáng';
    }

    // Progress bar for current 10s slice
    const phaseProgress = (t % 10.0) / 10.0;
    if (this.progressFill) {
      this.progressFill.style.width = `${(phaseProgress * 100).toFixed(1)}%`;
    }

    // 2. Dimensions & Coordinates
    const wrapW = this.wrapperEl.clientWidth;
    const { roadY1, roadY2 } = this.getRoadPositions();
    const wrapH = this.wrapperEl.clientHeight;

    // 3. Update Systems
    this.traffic.update(dt, wrapW);

    // 4. Render Traffic
    const tCtx = this.trafficCanvas.getContext('2d');
    tCtx.clearRect(0, 0, this.trafficCanvas.width, this.trafficCanvas.height);
    this.traffic.render({
      width: wrapW,
      height: wrapH,
      roadY1: roadY1,
      roadY2: roadY2
    }, wToi, wChieu);

    requestAnimationFrame((ts) => this.renderLoop(ts));
  }
}

// Start both when loaded normally and when imported after React has mounted.
const start = () => new App();
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
