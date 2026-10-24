import * as THREE from 'three';

const DT = 1 / 60;
const DRAG = 0.965;

export class ClothSimulation {
  constructor(width = 4.8, height = 3.25, w = 52, h = 32) {
    this.width = width;
    this.height = height;
    this.w = w;
    this.h = h;
    this.count = (w + 1) * (h + 1);
    this.positions = new Float32Array(this.count * 3);
    this.previous = new Float32Array(this.count * 3);
    this.original = new Float32Array(this.count * 3);
    this.constraints = [];
    this.pinFractions = [0.075, 0.37, 0.665, 0.935];
    this.pins = this.pinFractions.map((u) => Math.round(u * w));
    this.pinActive = [true, true, true, true];
    this.grabbed = -1;
    this.grabTarget = new THREE.Vector3();
    this.stretch = 0;
    this.reset();
  }

  index(x, y) { return y * (this.w + 1) + x; }

  reset() {
    for (let y = 0; y <= this.h; y++) {
      for (let x = 0; x <= this.w; x++) {
        const i = this.index(x, y) * 3;
        const u = x / this.w;
        const v = y / this.h;
        this.original[i] = (u - 0.5) * this.width;
        this.original[i + 1] = 2.4 - v * this.height;
        this.original[i + 2] = (Math.sin(u * Math.PI * 4) * 0.2 + Math.sin(u * 5 + v * 4) * 0.08) * v;
        this.positions[i] = this.previous[i] = this.original[i];
        this.positions[i + 1] = this.previous[i + 1] = this.original[i + 1];
        this.positions[i + 2] = this.previous[i + 2] = this.original[i + 2];
      }
    }
    this.pinActive.fill(true);
    this.grabbed = -1;
    this.constraints.length = 0;
    const add = (a, b, stiffness) => {
      const ai = a * 3, bi = b * 3;
      const dx = this.original[bi] - this.original[ai];
      const dy = this.original[bi + 1] - this.original[ai + 1];
      const dz = this.original[bi + 2] - this.original[ai + 2];
      this.constraints.push([a, b, Math.hypot(dx, dy, dz), stiffness]);
    };
    for (let y = 0; y <= this.h; y++) {
      for (let x = 0; x <= this.w; x++) {
        const a = this.index(x, y);
        if (x < this.w) add(a, this.index(x + 1, y), 1);
        if (y < this.h) add(a, this.index(x, y + 1), 1);
        if (x < this.w && y < this.h) {
          add(a, this.index(x + 1, y + 1), 0.82);
          add(this.index(x + 1, y), this.index(x, y + 1), 0.82);
        }
        if (x < this.w - 1) add(a, this.index(x + 2, y), 0.34);
        if (y < this.h - 1) add(a, this.index(x, y + 2), 0.34);
      }
    }
    this.enforcePins();
  }

  enforcePins() {
    for (let p = 0; p < this.pins.length; p++) {
      if (!this.pinActive[p]) continue;
      const i = this.pins[p] * 3;
      this.positions[i] = this.original[i];
      this.positions[i + 1] = this.original[i + 1];
      this.positions[i + 2] = this.original[i + 2];
      this.previous[i] = this.positions[i];
      this.previous[i + 1] = this.positions[i + 1];
      this.previous[i + 2] = this.positions[i + 2];
    }
    if (this.grabbed >= 0) {
      const i = this.grabbed * 3;
      this.positions[i] = this.grabTarget.x;
      this.positions[i + 1] = this.grabTarget.y;
      this.positions[i + 2] = this.grabTarget.z;
      this.previous[i] = this.positions[i];
      this.previous[i + 1] = this.positions[i + 1];
      this.previous[i + 2] = this.positions[i + 2];
    }
  }

  togglePin(index) {
    this.pinActive[index] = !this.pinActive[index];
    return this.pinActive[index];
  }

  nearestParticle(uv) {
    const x = Math.round(THREE.MathUtils.clamp(uv.x, 0, 1) * this.w);
    const y = Math.round(THREE.MathUtils.clamp(1 - uv.y, 0, 1) * this.h);
    return this.index(x, y);
  }

  step(time, wind, gust) {
    const dt2 = DT * DT;
    for (let i = 0; i < this.count; i++) {
      const k = i * 3;
      const x = this.positions[k], y = this.positions[k + 1], z = this.positions[k + 2];
      let vx = (x - this.previous[k]) * DRAG;
      let vy = (y - this.previous[k + 1]) * DRAG;
      let vz = (z - this.previous[k + 2]) * DRAG;
      const speed = Math.hypot(vx, vy, vz);
      if (speed > 0.13) { const limit = 0.13 / speed; vx *= limit; vy *= limit; vz *= limit; }
      const nx = x + vx;
      const ny = y + vy;
      const nz = z + vz;
      this.previous[k] = x; this.previous[k + 1] = y; this.previous[k + 2] = z;
      const u = (i % (this.w + 1)) / this.w;
      const v = Math.floor(i / (this.w + 1)) / this.h;
      const wave = Math.sin(time * 3.1 + u * 8.0 - v * 3.4) * 0.55
        + Math.sin(time * 5.3 - u * 4.2 + v * 6.0) * 0.25 + 0.65;
      const windAccel = ((wind + 0.8) * 1.15 + gust * 5.5) * wave;
      this.positions[k] = nx + (Math.sin(time * 1.7 + v * 4) * wind * 0.17) * dt2;
      this.positions[k + 1] = ny - 4.4 * dt2 + Math.cos(time * 2.3 + u * 5) * wind * 0.055 * dt2;
      this.positions[k + 2] = nz + windAccel * dt2;
    }

    let stretchSum = 0;
    for (let iteration = 0; iteration < 4; iteration++) {
      for (let c = 0; c < this.constraints.length; c++) {
        const [a, b, rest, stiffness] = this.constraints[c];
        const ai = a * 3, bi = b * 3;
        const dx = this.positions[bi] - this.positions[ai];
        const dy = this.positions[bi + 1] - this.positions[ai + 1];
        const dz = this.positions[bi + 2] - this.positions[ai + 2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
        if (iteration === 0 && c % 11 === 0) stretchSum += Math.max(0, distance / rest - 1);
        const correction = ((distance - rest) / distance) * 0.5 * stiffness;
        const cx = dx * correction, cy = dy * correction, cz = dz * correction;
        this.positions[ai] += cx; this.positions[ai + 1] += cy; this.positions[ai + 2] += cz;
        this.positions[bi] -= cx; this.positions[bi + 1] -= cy; this.positions[bi + 2] -= cz;
      }
      this.enforcePins();
    }
    this.stretch = THREE.MathUtils.lerp(this.stretch, stretchSum / Math.ceil(this.constraints.length / 11) * 100, 0.08);
  }
}
