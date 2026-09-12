/**
 * Minimal canvas confetti burst. Internal replacement for the
 * `canvas-confetti` package (ISC, https://github.com/catdad/canvas-confetti),
 * covering the options we use: particleCount, spread, angle, origin.
 */

export interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  angle?: number;
  origin?: { x?: number; y?: number };
}

const COLORS = ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"];
const GRAVITY = 0.5;
const DECAY = 0.94;
const START_VELOCITY = 45;
const TICKS = 200;

interface Particle {
  x: number;
  y: number;
  wobble: number;
  wobbleSpeed: number;
  velocity: number;
  angle2D: number;
  tiltAngle: number;
  color: string;
  shape: "square" | "circle";
  tick: number;
  totalTicks: number;
  decay: number;
  random: number;
}

function createParticle(canvas: HTMLCanvasElement, opts: Required<ConfettiOptions>): Particle {
  const radAngle = opts.angle * (Math.PI / 180);
  const radSpread = opts.spread * (Math.PI / 180);
  return {
    x: canvas.width * (opts.origin.x ?? 0.5),
    y: canvas.height * (opts.origin.y ?? 0.5),
    wobble: Math.random() * 10,
    wobbleSpeed: Math.min(0.11, Math.random() * 0.1 + 0.05),
    velocity: START_VELOCITY * 0.5 + Math.random() * START_VELOCITY,
    angle2D: -radAngle + (0.5 * radSpread - Math.random() * radSpread),
    tiltAngle: (Math.random() * 0.5 + 0.25) * Math.PI,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: Math.random() > 0.5 ? "square" : "circle",
    tick: 0,
    totalTicks: TICKS,
    decay: DECAY,
    random: Math.random() + 2,
  };
}

function updateParticle(context: CanvasRenderingContext2D, particle: Particle): boolean {
  particle.x += Math.cos(particle.angle2D) * particle.velocity + 0.4 * (Math.random() - 0.5);
  particle.y += Math.sin(particle.angle2D) * particle.velocity + GRAVITY;
  particle.velocity *= particle.decay;
  particle.wobble += particle.wobbleSpeed;
  particle.tiltAngle += 0.1;
  particle.tick += 1;

  const progress = particle.tick / particle.totalTicks;
  const x1 = particle.x + particle.random * Math.cos(particle.tiltAngle);
  const y1 = particle.y + particle.random * Math.sin(particle.tiltAngle);
  const wobbleX = particle.x + 10 * Math.cos(particle.wobble);
  const wobbleY = particle.y + 10 * Math.sin(particle.wobble);

  context.fillStyle = particle.color;
  context.globalAlpha = 1 - progress;
  context.beginPath();
  if (particle.shape === "circle") {
    context.ellipse(
      particle.x,
      particle.y,
      Math.abs(wobbleX - x1) * 0.35,
      Math.abs(wobbleY - y1) * 0.35,
      (Math.PI / 10) * particle.wobble,
      0,
      2 * Math.PI,
    );
  } else {
    context.moveTo(Math.floor(particle.x), Math.floor(particle.y));
    context.lineTo(Math.floor(particle.x + particle.wobble), Math.floor(y1));
    context.lineTo(Math.floor(wobbleX), Math.floor(wobbleY));
    context.lineTo(Math.floor(x1), Math.floor(particle.y + particle.wobble));
  }
  context.closePath();
  context.fill();
  context.globalAlpha = 1;

  return particle.tick < particle.totalTicks;
}

export function fireConfetti(options: ConfettiOptions = {}): void {
  if (typeof document === "undefined") return;

  const opts: Required<ConfettiOptions> = {
    particleCount: options.particleCount ?? 50,
    spread: options.spread ?? 45,
    angle: options.angle ?? 90,
    origin: { x: options.origin?.x ?? 0.5, y: options.origin?.y ?? 0.5 },
  };

  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483647";
  document.body.appendChild(canvas);

  const context = canvas.getContext("2d");
  if (!context) {
    canvas.remove();
    return;
  }

  let particles = Array.from({ length: opts.particleCount }, () => createParticle(canvas, opts));

  const frame = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter((particle) => updateParticle(context, particle));
    if (particles.length) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(frame);
}
