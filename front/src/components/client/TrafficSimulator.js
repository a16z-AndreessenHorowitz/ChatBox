import vehicle1Image from "../../assets/vehicle1.png";
import vehicle2Image from "../../assets/vehicle2.png";

/**
 * Traffic Simulator with Animated Spritesheet Atlas
 * Uses vehicle1.png and vehicle2.png sprite sheets (6 frames per vehicle)
 * Includes:
 * - Lambo, VinFast VF8, Sedan, CTUT Bus, Police, Future SH, Moto Sport, GHN Truck, Purple Sport
 * - Physical wheel rotation frame synchronization
 * - Wet road reflection under tires
 * - Dynamic night headlights, taillights, and police sirens
 */

export class TrafficSimulator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.atlases = {
      vehicle1: new Image(),
      vehicle2: new Image()
    };
    // Explicit pixel boundaries avoid fractional-row bleeding in vehicle2.
    this.atlasGrids = {
      vehicle1: {
        x: [0, 212, 424, 636, 848, 1060, 1272],
        y: [0, 207, 414, 621, 828, 1035, 1242]
      },
      vehicle2: {
        x: [0, 212, 424, 636, 848, 1060, 1272],
        y: [0, 138, 276, 414, 552, 690, 828, 966, 1104, 1242]
      }
    };
    this.atlasLoaded = false;
    let loadedAtlases = 0;
    Object.values(this.atlases).forEach((image) => {
      image.onload = () => {
        loadedAtlases += 1;
        this.atlasLoaded = loadedAtlases === Object.keys(this.atlases).length;
      };
    });
    this.atlases.vehicle1.src = vehicle1Image;
    this.atlases.vehicle2.src = vehicle2Image;

    // Vehicle specifications from atlas
    // Each row is one vehicle and each row contains 6 animation frames.
    // vehicle1: bus, SUV, motorbike, police motorbike, taxi, delivery motorbike.
    // vehicle2: sports car, SUV, sedan, bus, police car, scooter, sport bike, truck, sedan.
    this.vehicleDefs = {
      vehicle1_bus:       { atlas: 'vehicle1', row: 0, rows: 6, w: 250, h: 180, baseSpeed: 130, weight: 8 },
      vehicle1_suv:       { atlas: 'vehicle1', row: 1, rows: 6, w: 160, h: 130, baseSpeed: 165, weight: 12 },
      vehicle1_moto:      { atlas: 'vehicle1', row: 2, rows: 6, w: 160, h: 104, baseSpeed: 190, weight: 18 },
      vehicle1_police:    { atlas: 'vehicle1', row: 3, rows: 6, w: 160, h: 104, baseSpeed: 195, weight: 7, police: true },
      vehicle1_taxi:      { atlas: 'vehicle1', row: 4, rows: 6, w: 160, h: 104, baseSpeed: 175, weight: 12 },
      vehicle1_delivery:  { atlas: 'vehicle1', row: 5, rows: 6, w: 160, h: 90, baseSpeed: 180, weight: 14 },
      vehicle2_sport:     { atlas: 'vehicle2', row: 0, rows: 9, w: 160, h: 104, baseSpeed: 210, weight: 10 },
      vehicle2_suv:       { atlas: 'vehicle2', row: 1, rows: 9, w: 160, h: 104, baseSpeed: 165, weight: 12 },
      vehicle2_sedan:     { atlas: 'vehicle2', row: 2, rows: 9, w: 160, h: 104, baseSpeed: 160, weight: 16 },
      vehicle2_bus:       { atlas: 'vehicle2', row: 3, rows: 9, w: 250, h: 120, baseSpeed: 130, weight: 8 },
      vehicle2_police:    { atlas: 'vehicle2', row: 4, rows: 9, w: 160, h: 104, baseSpeed: 195, weight: 7, police: true },
      vehicle2_scooter:   { atlas: 'vehicle2', row: 5, rows: 9, w: 160, h: 104, baseSpeed: 185, weight: 18 },
      vehicle2_sportbike: { atlas: 'vehicle2', row: 6, rows: 9, w: 160, h: 104, baseSpeed: 205, weight: 14 },
      vehicle2_truck:     { atlas: 'vehicle2', row: 7, rows: 9, w: 250, h: 150, baseSpeed: 145, weight: 10 },
      vehicle2_purple:    { atlas: 'vehicle2', row: 8, rows: 9, w: 160, h: 104, baseSpeed: 205, weight: 10 }
    };

    this.vehicles = [];
    // Start close to the spawn threshold so traffic is visible almost at once.
    this.spawnTimerLane1 = 1.8;
    this.spawnTimerLane2 = 1.6;
    this.time = 0;
  }

  pickRandomType() {
    const keys = Object.keys(this.vehicleDefs);
    const totalWeight = keys.reduce((sum, k) => sum + this.vehicleDefs[k].weight, 0);
    let rand = Math.random() * totalWeight;
    for (const key of keys) {
      if (rand < this.vehicleDefs[key].weight) return key;
      rand -= this.vehicleDefs[key].weight;
    }
    return 'sedan';
  }

  spawnVehicle(lane, roadWidth) {
    const typeKey = this.pickRandomType();
    const def = this.vehicleDefs[typeKey];

    // Lane 1: Far lane (heading right to left, dir = -1)
    // Lane 2: Near lane (heading left to right, dir = 1)
    const dir = lane === 1 ? -1 : 1;
    const laneScale = lane === 1 ? 0.8 : 1.1;
    const speedVariation = 0.88 + Math.random() * 0.28;
    const speed = def.baseSpeed * speedVariation * dir;

    const startX = dir === 1 ? -def.w * laneScale - 80 : roadWidth + 80;

    // Check distance with last spawned vehicle in same lane
    const minGap = (def.w * laneScale) + 75 + Math.random() * 80;
    for (const v of this.vehicles) {
      if (v.lane === lane) {
        if (Math.abs(v.x - startX) < minGap) return;
      }
    }

    this.vehicles.push({
      type: typeKey,
      lane: lane,
      dir: dir,
      scale: laneScale,
      x: startX,
      speed: speed,
      origSpeed: speed,
      length: def.w * laneScale,
      frameOffset: Math.floor(Math.random() * 6),
      animDist: 0
    });
  }

  update(dt, roadWidth) {
    this.time += dt;

    // Spawning frequency
    this.spawnTimerLane1 += dt;
    this.spawnTimerLane2 += dt;

    if (this.spawnTimerLane1 > 1.6 + Math.random() * 1.3) {
      this.spawnVehicle(1, roadWidth);
      this.spawnTimerLane1 = 0;
    }

    if (this.spawnTimerLane2 > 1.4 + Math.random() * 1.2) {
      this.spawnVehicle(2, roadWidth);
      this.spawnTimerLane2 = 0;
    }

    // Vehicle motion & simple following behavior
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];

      let targetSpeed = v.origSpeed;
      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        if (other.lane === v.lane) {
          const ahead = v.dir === 1 ? (other.x > v.x) : (other.x < v.x);
          const gap = Math.abs(other.x - v.x) - (v.length + other.length) / 2;
          if (ahead && gap < 65) {
            targetSpeed = other.speed * 0.95;
            break;
          }
        }
      }

      v.speed += (targetSpeed - v.speed) * Math.min(1.0, dt * 3.5);
      v.x += v.speed * dt;
      v.animDist += Math.abs(v.speed) * dt;
    }

    // Remove vehicles out of bounds
    const margin = 400;
    this.vehicles = this.vehicles.filter(v => {
      if (v.dir === 1 && v.x > roadWidth + margin) return false;
      if (v.dir === -1 && v.x < -margin) return false;
      return true;
    });
  }

  /**
   * Render vehicles with 6-frame atlas animation, reflections, and night lighting
   */
  render(bounds, nightFactor = 0, sunsetFactor = 0) {
    if (!this.atlasLoaded) return;
    const ctx = this.ctx;

    // Sort: Lane 1 (far) first, Lane 2 (near) second
    const sorted = [...this.vehicles].sort((a, b) => a.lane - b.lane);
    // The new sprite sheets already contain large, detailed vehicles.
    // Keep the scene scale at 1:1 so neighbouring frames do not visually overlap.
    const globalScale = (bounds.width / 1672)*1.5;

    for (const v of sorted) {
      const def = this.vehicleDefs[v.type];
      const atlas = this.atlases[def.atlas];
      const targetY = v.lane === 1 ? bounds.roadY1 : bounds.roadY2;
      const vScale = v.scale * globalScale;

      const drawW = def.w * vScale;
      const drawH = def.h * vScale;
      const groundY = targetY;

      // 6 frames animation based on distance traveled (wheel rolling)
      const frameIndex = Math.floor((v.animDist / 16) + v.frameOffset) % 6;
      const grid = this.atlasGrids[def.atlas];
      const sx = grid.x[frameIndex];
      const sy = grid.y[def.row];
      const sourceW = grid.x[frameIndex + 1] - sx;
      const sourceH = grid.y[def.row + 1] - sy;

      // 1. Wet Road Mirror Reflection
      ctx.save();
      ctx.globalAlpha = 0.24 * (1.0 - nightFactor * 0.3);
      ctx.translate(v.x, groundY);
      ctx.scale(v.dir, -0.42); // flipped vertically and squashed for perspective
      ctx.drawImage(
        atlas,
        sx, sy, sourceW, sourceH,
        -drawW / 2, 0, drawW, drawH
      );
      ctx.restore();

      // 2. Main Vehicle Sprite
      ctx.save();
      ctx.translate(v.x, groundY);
      ctx.scale(v.dir, 1);

      // Night brightness reduction on vehicle body
      if (nightFactor > 0.2) {
        ctx.filter = `brightness(${(1.0 - nightFactor * 0.35).toFixed(2)})`;
      }

      ctx.drawImage(
        atlas,
        sx, sy, sourceW, sourceH,
        -drawW / 2, -drawH, drawW, drawH
      );
      ctx.restore();

      // 3. Night Lighting: Headlights & Taillights
      const lightFactor = Math.max(nightFactor, sunsetFactor * 0.6);
      if (lightFactor > 0.15) {
        this.renderVehicleLights(ctx, v, groundY, drawW, drawH, lightFactor, globalScale);
      }
    }
  }

  renderVehicleLights(ctx, v, groundY, drawW, drawH, intensity, globalScale) {
    const noseX = v.x + (drawW * 0.25 * v.dir);
    const tailX = v.x - (drawW * 0.38 * v.dir);
    const lightY = groundY - drawH * 0.36;

    // Volumetric Headlight Cone projecting onto the wet street
    const beamLength = 170 * v.scale * globalScale;
    const beamSpread = 42 * v.scale * globalScale;

    ctx.save();
    const beamGrad = ctx.createRadialGradient(
      noseX, lightY, 2,
      noseX + beamLength * 0.6 * v.dir, lightY, beamLength
    );
    beamGrad.addColorStop(0, `rgba(255, 255, 220, ${(0.85 * intensity).toFixed(2)})`);
    beamGrad.addColorStop(0.3, `rgba(255, 245, 180, ${(0.45 * intensity).toFixed(2)})`);
    beamGrad.addColorStop(0.8, `rgba(255, 240, 150, ${(0.12 * intensity).toFixed(2)})`);
    beamGrad.addColorStop(1, 'rgba(255, 240, 150, 0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(noseX, lightY);
    ctx.lineTo(noseX + beamLength * v.dir, lightY - beamSpread * 0.3);
    ctx.lineTo(noseX + beamLength * v.dir, lightY + beamSpread);
    ctx.closePath();
    ctx.fill();

    // Taillight red glow & flare
    const tailGrad = ctx.createRadialGradient(
      tailX, lightY, 1,
      tailX, lightY, 18 * v.scale
    );
    tailGrad.addColorStop(0, `rgba(255, 40, 40, ${(0.95 * intensity).toFixed(2)})`);
    tailGrad.addColorStop(0.4, `rgba(255, 20, 20, ${(0.55 * intensity).toFixed(2)})`);
    tailGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');

    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.arc(tailX, lightY, 18 * v.scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
