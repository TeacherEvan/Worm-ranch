/* ============================================================================
   PARTICLE BURST SYSTEM — "Neon confetti" feel without the weight
   Rules:
   - Max 60 particles per frame (GPU-friendly)
   - Life ~220–380ms, quadratic ease-out
   - Each event spawns 12–18 particles
   - Colors drawn from neon token palette per event type
   - Reduced motion: emit 1 circle flash instead of particle cloud
============================================================================= */

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;        // 2–5 px
  color: string;       // CSS color string (from neon tokens)
  life: number;        // 0–1 normalized
  maxLife: number;     // ms
  rotation: number;  // radians
  spin: number;      // rad/ms
  gravity: number;   // px/ms² — copied from tone config at spawn (per-particle)
  shape: "square" | "circle" | "triangle";
};

export type ParticleBurstConfig = {
  count: number;       // 12–18
  x: number;
  y: number;
  baseColor: string;   // neon token hex
  colorVariance: number; // hue shift amount
  speedRange: [number, number];   // px/ms
  sizeRange: [number, number];    // px
  lifeRange: [number, number];    // ms
  gravity: number;     // px/ms² (downward pull)
  spread: number;      // radians (0 = directional, PI = full circle)
  direction: number;   // base angle in radians
  shapes: Particle["shape"][];
};

export type ParticleTone = "collect" | "teleport" | "tag" | "outlaw" | "fairy" | "rush" | "countdown";

const TONE_CONFIGS: Record<ParticleTone, Omit<ParticleBurstConfig, "x" | "y" | "count">> = {
  collect: {
    // Neon lime burst — sharp, upward bias
    baseColor: "#C7F36B",
    colorVariance: 0.15,
    speedRange: [0.12, 0.28],
    sizeRange: [2, 4],
    lifeRange: [200, 320],
    gravity: 0.00018,
    spread: Math.PI * 0.7,
    direction: -Math.PI / 2,
    shapes: ["square", "circle", "triangle"],
  },
  teleport: {
    // Neon cyan ring — radial, cyan→purple shift
    baseColor: "#00F5FF",
    colorVariance: 0.25,
    speedRange: [0.18, 0.35],
    sizeRange: [3, 5],
    lifeRange: [180, 280],
    gravity: 0,
    spread: Math.PI * 2,
    direction: 0,
    shapes: ["circle", "triangle"],
  },
  tag: {
    // Neon amber → orange progression
    baseColor: "#FFD44A",
    colorVariance: 0.2,
    speedRange: [0.08, 0.2],
    sizeRange: [2, 3],
    lifeRange: [280, 420],
    gravity: 0.00012,
    spread: Math.PI * 0.5,
    direction: -Math.PI / 2,
    shapes: ["circle", "square"],
  },
  outlaw: {
    // Neon pink + orange — aggressive, wide spread
    baseColor: "#FF3366",
    colorVariance: 0.3,
    speedRange: [0.15, 0.4],
    sizeRange: [3, 6],
    lifeRange: [220, 380],
    gravity: 0.00022,
    spread: Math.PI * 1.2,
    direction: -Math.PI / 2,
    shapes: ["triangle", "square", "circle"],
  },
  fairy: {
    // Neon purple + cyan — slow, floaty, long tails
    baseColor: "#BC9FFF",
    colorVariance: 0.2,
    speedRange: [0.06, 0.15],
    sizeRange: [2, 4],
    lifeRange: [400, 600],
    gravity: -0.00008, // slight float up
    spread: Math.PI * 1.5,
    direction: -Math.PI / 2,
    shapes: ["circle"],
  },
  rush: {
    // Neon orange horizontal surge
    baseColor: "#F07E43",
    colorVariance: 0.15,
    speedRange: [0.25, 0.45],
    sizeRange: [2, 4],
    lifeRange: [150, 250],
    gravity: 0.0001,
    spread: Math.PI * 0.3,
    direction: 0,
    shapes: ["square", "triangle"],
  },
  countdown: {
    // Neon cyan pulse — centered, quick
    baseColor: "#00F5FF",
    colorVariance: 0.1,
    speedRange: [0.1, 0.22],
    sizeRange: [2, 3],
    lifeRange: [120, 200],
    gravity: 0,
    spread: Math.PI * 2,
    direction: 0,
    shapes: ["circle"],
  },
};

function hueShift(hex: string, amount: number): string {
  // Simple hue shift via HSL conversion (approximate for neon colors)
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  h = (h + amount * 360) % 360;

  // HSL back to RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function createBurst(config: ParticleBurstConfig): Particle[] {
  const particles: Particle[] = [];
  const { count, ...rest } = config;

  for (let i = 0; i < count; i++) {
    const angle = rest.direction + (Math.random() - 0.5) * rest.spread;
    const speed = rand(...rest.speedRange);
    const size = rand(...rest.sizeRange);
    const life = rand(...rest.lifeRange);
    const hueVariance = (Math.random() - 0.5) * 2 * rest.colorVariance;

    particles.push({
      x: config.x,
      y: config.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color: hueShift(rest.baseColor, hueVariance),
      life: 0,
      maxLife: life,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.02,
      gravity: rest.gravity,
      shape: rest.shapes[randInt(0, rest.shapes.length - 1)],
    });
  }

  return particles;
}

export function createBurstFromTone(
  tone: ParticleTone,
  x: number,
  y: number,
  count?: number
): Particle[] {
  const cfg = TONE_CONFIGS[tone];
  return createBurst({
    ...cfg,
    x,
    y,
    count: count ?? randInt(12, 18),
  });
}

export function stepParticles(particles: Particle[], deltaMs: number): Particle[] {
  const alive: Particle[] = [];

  for (const p of particles) {
    p.life += deltaMs;
    if (p.life >= p.maxLife) continue;

    const t = p.life / p.maxLife;
    const easeOut = 1 - (1 - t) * (1 - t); // quadratic ease-out

    p.x += p.vx * deltaMs;
    p.y += p.vy * deltaMs;
    p.vy += p.gravity * deltaMs; // per-particle gravity (tone-specific)
    p.rotation += p.spin * deltaMs;

    // Size grows then shrinks
    p.size *= 1 + (1 - easeOut) * 0.02 * deltaMs;

    alive.push(p);
  }

  return alive;
}

export function drawParticles(
  context: CanvasRenderingContext2D,
  particles: Particle[],
  reducedMotion: boolean
): void {
  if (reducedMotion) {
    // Draw single flash circles instead of particle cloud
    for (const p of particles) {
      const t = p.life / p.maxLife;
      const alpha = 1 - t;
      context.save();
      context.globalAlpha = alpha * 0.6;
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    return;
  }

  for (const p of particles) {
    const t = p.life / p.maxLife;
    const alpha = Math.max(0, 1 - t * t); // quadratic fade
    const size = p.size * (1 - t * 0.3);

    if (alpha < 0.02) continue;

    context.save();
    context.translate(p.x, p.y);
    context.rotate(p.rotation);
    context.globalAlpha = alpha;
    context.fillStyle = p.color;

    switch (p.shape) {
      case "square": {
        const half = size / 2;
        context.fillRect(-half, -half, size, size);
        break;
      }
      case "circle": {
        context.beginPath();
        context.arc(0, 0, size / 2, 0, Math.PI * 2);
        context.fill();
        break;
      }
      case "triangle": {
        const r = size / 2;
        context.beginPath();
        context.moveTo(0, -r);
        context.lineTo(r * 0.866, r * 0.5);
        context.lineTo(-r * 0.866, r * 0.5);
        context.closePath();
        context.fill();
        break;
      }
    }

    context.restore();
  }
}

/* ============================================================================
   REDUCED MOTION FLASH — single expanding ring per event
   Used when prefers-reduced-motion is active
============================================================================= */

export type ReducedFlash = {
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
  maxRadius: number;
};

export function createReducedFlash(x: number, y: number, color: string, maxRadius = 80): ReducedFlash {
  return {
    x,
    y,
    color,
    life: 0,
    maxLife: 180,
    maxRadius,
  };
}

export function stepReducedFlash(flash: ReducedFlash, deltaMs: number): ReducedFlash | null {
  flash.life += deltaMs;
  if (flash.life >= flash.maxLife) return null;
  return flash;
}

export function drawReducedFlash(context: CanvasRenderingContext2D, flash: ReducedFlash): void {
  const t = flash.life / flash.maxLife;
  const radius = flash.maxRadius * t;
  const alpha = (1 - t) * 0.5;

  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = flash.color;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}