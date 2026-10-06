/**
 * Sky & Atmosphere Engine
 * Handles:
 * - Time-of-day sky gradients (Day, Golden Sunset, Night)
 * - Volumetric drifting clouds
 * - Sun flare & light shafts (Day/Sunset)
 * - Twinkling starfield (Night)
 * - Flying distant birds
 */

export class SkyAtmosphere {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.mode = 'day'; // 'day', 'sunset', 'night'
    this.transitionProgress = 1.0;
    this.currentMode = 'day';
    this.targetMode = 'day';

    // Sky presets
    this.presets = {
      day: {
        skyTop: '#4B88E8',
        skyBottom: '#C5DCFF',
        sunColor: 'rgba(255, 255, 230, 0.95)',
        sunGlow: 'rgba(255, 240, 180, 0.35)',
        sunX: 0.18,
        sunY: 0.15,
        tint: 'rgba(0, 0, 0, 0)',
        cloudOpacity: 0.55
      },
      sunset: {
        skyTop: '#2C1B4D',
        skyBottom: '#FD746C',
        sunColor: 'rgba(255, 170, 70, 0.95)',
        sunGlow: 'rgba(255, 120, 50, 0.45)',
        sunX: 0.15,
        sunY: 0.28,
        tint: 'rgba(255, 110, 30, 0.15)',
        cloudOpacity: 0.75
      },
      night: {
        skyTop: '#060B19',
        skyBottom: '#101B33',
        sunColor: 'rgba(220, 230, 255, 0.9)',
        sunGlow: 'rgba(180, 200, 255, 0.25)',
        sunX: 0.82,
        sunY: 0.18,
        tint: 'rgba(10, 20, 45, 0.48)',
        cloudOpacity: 0.25
      }
    };

    // Procedural Clouds
    this.clouds = [
      { x: 100, y: 40, w: 280, h: 70, speed: 12 },
      { x: 500, y: 80, w: 380, h: 90, speed: 8 },
      { x: 950, y: 30, w: 320, h: 75, speed: 14 },
      { x: 1400, y: 65, w: 420, h: 95, speed: 10 },
      { x: 1900, y: 45, w: 300, h: 70, speed: 11 }
    ];

    // Starfield for night mode
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random() * 0.45, // in sky area
        r: 0.7 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1 + Math.random() * 3
      });
    }

    // Birds
    this.birds = [
      { x: 200, y: 120, speed: 45, wingPhase: 0, scale: 0.8 },
      { x: 240, y: 135, speed: 42, wingPhase: 0.8, scale: 0.7 },
      { x: 270, y: 110, speed: 46, wingPhase: 1.5, scale: 0.65 }
    ];
  }

  setMode(mode) {
    if (this.presets[mode] && this.mode !== mode) {
      this.mode = mode;
    }
  }

  update(dt) {
    const w = this.canvas.width;

    // Drifting clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x - cloud.w > w) {
        cloud.x = -cloud.w - 50;
      }
    }

    // Flying birds
    for (const bird of this.birds) {
      bird.x += bird.speed * dt;
      bird.wingPhase += dt * 12;
      if (bird.x > w + 100) {
        bird.x = -100;
        bird.y = 80 + Math.random() * 120;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const p = this.presets[this.mode];

    // 1. Draw Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    skyGrad.addColorStop(0, p.skyTop);
    skyGrad.addColorStop(1, p.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Stars (if night)
    if (this.mode === 'night') {
      const now = performance.now() * 0.001;
      for (const star of this.stars) {
        const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(now * star.twinkleSpeed + star.phase));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Sun or Moon
    const sunPx = p.sunX * w;
    const sunPy = p.sunY * h;

    // Radial Sun/Moon Flare
    const sunFlare = ctx.createRadialGradient(sunPx, sunPy, 10, sunPx, sunPy, 220);
    sunFlare.addColorStop(0, p.sunColor);
    sunFlare.addColorStop(0.3, p.sunGlow);
    sunFlare.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunFlare;
    ctx.beginPath();
    ctx.arc(sunPx, sunPy, 220, 0, Math.PI * 2);
    ctx.fill();

    // Core Orb
    ctx.fillStyle = p.sunColor;
    ctx.beginPath();
    ctx.arc(sunPx, sunPy, this.mode === 'night' ? 24 : 32, 0, Math.PI * 2);
    ctx.fill();

    // 4. Clouds
    for (const cloud of this.clouds) {
      this.drawCloud(ctx, cloud.x, cloud.y, cloud.w, cloud.h, p.cloudOpacity);
    }

    // 5. Birds in day/sunset
    if (this.mode !== 'night') {
      for (const bird of this.birds) {
        this.drawBird(ctx, bird.x, bird.y, bird.scale, bird.wingPhase);
      }
    }
  }

  // Draw soft puffy cloud
  drawCloud(ctx, cx, cy, cw, ch, opacity) {
    ctx.save();
    ctx.fillStyle = this.mode === 'sunset' ? `rgba(255, 215, 190, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    
    // Multiple overlapping ellipses
    const r = ch * 0.45;
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx + cw * 0.25, cy - ch * 0.15, r * 1.3, 0, Math.PI * 2);
    ctx.arc(cx + cw * 0.55, cy - ch * 0.1, r * 1.2, 0, Math.PI * 2);
    ctx.arc(cx + cw * 0.8, cy, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw flapping bird silhouette
  drawBird(ctx, x, y, scale, wingPhase) {
    ctx.save();
    ctx.strokeStyle = this.mode === 'sunset' ? '#3B1A2A' : '#2D3748';
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    const wingY = Math.sin(wingPhase) * 6 * scale;
    ctx.moveTo(x - 12 * scale, y + wingY);
    ctx.quadraticCurveTo(x - 6 * scale, y - 4 * scale, x, y);
    ctx.quadraticCurveTo(x + 6 * scale, y - 4 * scale, x + 12 * scale, y + wingY);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Returns ambient lighting overlay color for the building/road
   */
  getAmbientTint() {
    return this.presets[this.mode].tint;
  }
}
