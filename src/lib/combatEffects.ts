import { FunctionType } from '../types';

export interface HitVfxParams {
  x: number; // 怪物坐标系 x（游戏世界坐标）
  y: number; // 怪物坐标系 y
  hitCount: number; // 本次发射总击杀数
  isBomb?: boolean; // 是否炸弹清屏
}

export interface ParticleEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  /** 是否有拖尾 */
  hasTrail: boolean;
  /** 拖尾长度 px（屏幕坐标下，后续绘制时按 scale 转换） */
  trailLength?: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

const RAINBOW_COLORS = [
  '#FF0055',
  '#FF7700',
  '#FFD700',
  '#00FF41',
  '#00CCFF',
  '#AA00FF',
];

function pickKillColor(hitCount: number, isBomb: boolean): string {
  if (isBomb) {
    return '#FF3D00';
  }

  if (hitCount === 1) {
    return Math.random() < 0.6 ? '#00FF41' : '#FFFFFF';
  }

  if (hitCount >= 2 && hitCount <= 4) {
    const r = Math.random();
    if (r < 0.3) return '#00FF41';
    if (r < 0.6) return '#FFFFFF';
    return '#FFD700';
  }

  // hitCount >= 5
  return RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];
}

function getParticleCount(hitCount: number, isBomb: boolean): number {
  if (isBomb) {
    return 80;
  }
  if (hitCount >= 5) {
    return 50;
  }
  if (hitCount >= 3) {
    return 40;
  }
  return 30;
}

export function createKillParticles(p: HitVfxParams): ParticleEffect[] {
  const { x, y, hitCount, isBomb = false } = p;
  const count = getParticleCount(hitCount, isBomb);
  const particles: ParticleEffect[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = isBomb ? 0.12 : 0.03;
    const speedVar = isBomb ? 0.05 : 0.08;
    const speed = Math.random() * speedVar + baseSpeed;

    const size = 3 + Math.random() * 5;
    const life = 600 + Math.random() * 600;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color: pickKillColor(hitCount, isBomb),
      size,
      hasTrail: true,
      trailLength: size * 2,
    });
  }

  return particles;
}

export function createShockwave(p: HitVfxParams): Shockwave {
  const { x, y, hitCount, isBomb = false } = p;
  const maxLife = 400;
  const color = hitCount >= 5 ? '#FFD700' : '#FFFFFF';

  return {
    x,
    y,
    radius: 0,
    maxRadius: 0.3 + Math.min(isBomb ? hitCount : hitCount, 10) * 0.08,
    life: maxLife,
    maxLife,
    color,
  };
}
