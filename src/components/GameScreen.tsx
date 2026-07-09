import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as math from 'mathjs';
import { FunctionType, Monster, Difficulty, PowerUp, DLCConfig, RestrictionZone, DLC_MULTIPLIERS } from '../types';
import { Volume2, LogOut } from 'lucide-react';
import { ParamSlider } from './ParamSlider';
import { PARAMS_CONFIG, getDefaultParams } from '../lib/paramConfig';
import { audio } from '../lib/audio';
import { Language, i18n } from '../lib/i18n';
import { SessionAchievementTracker } from '../lib/achievements';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size?: number;
}

interface GameScreenProps {
  onGameOver: (score: number) => void;
  onQuit: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  difficulty: Difficulty;
  dlcConfig: DLCConfig;
  getSessionTracker: (maxHealth: number) => SessionAchievementTracker;
}

export function GameScreen({ onGameOver, onQuit, lang, setLang, difficulty, dlcConfig, getSessionTracker }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const t = i18n[lang];
  
  const { activeModes } = dlcConfig;
  const hasPressure = activeModes.includes('pressure');
  const hasObstacle = activeModes.includes('obstacle');
  const hasFervor = activeModes.includes('fervor');
  
  // DLC 倍率：乘法累积
  const dlcMultiplier = activeModes.reduce((product, mode) => {
    const level = mode === 'pressure' ? dlcConfig.pressureLevel : mode === 'obstacle' ? dlcConfig.obstacleLevel : 1;
    return product * DLC_MULTIPLIERS[mode][level - 1];
  }, 1.0);
  
  const difficultyMultiplier = difficulty === 'easy' ? 0.75 : difficulty === 'hard' ? 1.25 : 1.0;
  const finalScoreMultiplier = difficultyMultiplier * dlcMultiplier;
  
  // Fervor mode: max health = 3
  const baseMaxHealth = hasFervor ? 3 : 5;
  const maxHealth = baseMaxHealth;
  
  // Fervor mode: cooldown halved
  let baseCooldown = 1500;
  let baseTrigCooldown = 5000;
  if (hasFervor) {
    baseCooldown = 700;
    baseTrigCooldown = 2500;
  }
  
  // Obstacle zones
  const obstacleZones = useRef<RestrictionZone[]>([]);
  const obstacleHitThisShot = useRef(false);
  const lastObstacleReposition = useRef<number>(0);
  
  // Generate random obstacle zones
  const generateObstacleZones = (count: number): RestrictionZone[] => {
    const zones: RestrictionZone[] = [];
    for (let i = 0; i < count; i++) {
      zones.push({
        gridX: Math.floor(Math.random() * 11) - 5, // -5 to 5
        gridY: Math.floor(Math.random() * 11) - 5, // -5 to 5
      });
    }
    return zones;
  };

  // Initialize obstacle zones
  useEffect(() => {
    if (hasObstacle) {
      obstacleZones.current = generateObstacleZones(dlcConfig.obstacleLevel);
    } else {
      obstacleZones.current = [];
    }
    lastObstacleReposition.current = 0;
  }, [hasObstacle, dlcConfig.obstacleLevel]);
  
  // Game State
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(maxHealth);
  const [comboText, setComboText] = useState<{ text: string; opacity: number } | null>(null);
  const [obstacleHitFlash, setObstacleHitFlash] = useState(false);
  
  // 成就追踪器
  const trackerRef = useRef<SessionAchievementTracker | null>(null);
  const trackerInitializedRef = useRef(false);
  
  // 初始化成就追踪器
  useEffect(() => {
    if (!trackerInitializedRef.current) {
      trackerRef.current = getSessionTracker(maxHealth);
      trackerInitializedRef.current = true;
    }
  }, []);
  
  // 同步血量到追踪器
  useEffect(() => {
    if (trackerRef.current) {
      trackerRef.current.currentHealth = health;
      trackerRef.current.maxHealth = maxHealth;
    }
  }, [health, maxHealth]);
  
  // Control Panel State
  const [funcType, setFuncType] = useState<FunctionType>('linear');
  const [params, setParams] = useState<Record<string, string>>(() => getDefaultParams('linear'));
  const [cooldown, setCooldown] = useState(0);
  const [lastUsedFunc, setLastUsedFunc] = useState<FunctionType | null>(null);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [volume, setVolume] = useState(audio.volume);
  const [cssShake, setCssShake] = useState(false);

  // Mutable Game Data (Ref for game loop)
  const gameState = useRef({
    monsters: [] as Monster[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    bgParticles: [] as Particle[],
    shakeTime: 0,
    shakeIntensity: 0,
    lastSpawnTime: 0,
    lastPowerUpSpawnTime: 0,
    slowMotionEndTime: 0,
    spawnInterval: 2500,
    health: maxHealth,
    score: 0,
    lastTime: 0
  });

  // Sync initial health
  useEffect(() => {
    gameState.current.health = maxHealth;
    setHealth(maxHealth);
  }, [maxHealth]);

  // Keep refs for rendering the curve
  const currentFormula = useRef<string>('x');

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    audio.setVolume(v);
  };

  // Generate formula based on type and params
  useEffect(() => {
    let formula = '';
    const p = params;
    
    const v = (key: string) => {
      const val = p[key];
      if (!val || val === '-' || val === '.' || val === '-.') return '0';
      return isNaN(Number(val)) ? '0' : val;
    };

    switch (funcType) {
      case 'linear':
        formula = `${v('k')} * x + ${v('b')}`;
        break;
      case 'quadratic':
        formula = `${v('a')} * x ^ 2 + ${v('b')} * x + ${v('c')}`;
        break;
      case 'rational':
        formula = `${v('k')} / (x - ${v('h')}) + ${v('m')}`;
        break;
      case 'power':
        formula = `${v('a')} * x ^ ${v('n')}`;
        break;
      case 'trigonometric':
        formula = `${v('A')} * sin(${v('w')} * x + ${v('phi')})`;
        break;
      case 'tangent':
        formula = `${v('A')} * tan(${v('w')} * x + ${v('phi')})`;
        break;
      case 'constant_x':
        formula = `constant_x:${v('k')}`;
        break;
      case 'constant_y':
        formula = `${v('k')}`;
        break;
      default:
        formula = '0';
    }
    
    currentFormula.current = formula;
    
    if (formula.startsWith('constant_x:')) {
      setFormulaError(null);
    } else {
      try {
        math.compile(formula);
        setFormulaError(null);
      } catch (e: any) {
        setFormulaError(e.message || 'Syntax Error');
      }
    }
  }, [funcType, params]);

  // Handle function type change
  const handleFuncChange = useCallback((type: FunctionType) => {
    setFuncType(type);
    setParams(getDefaultParams(type));
  }, []);

  const handleParamChange = (key: string, value: string) => {
    if (value === '' || value === '-' || value === '.' || value === '-.' || !isNaN(Number(value))) {
      setParams((prev: Record<string, string>) => ({ ...prev, [key]: value }));
    }
  };

  // Cooldown effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 100), 100);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Draw coordinate system
  const drawCoordinateSystem = (ctx: CanvasRenderingContext2D, width: number, height: number, scale: number) => {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    for (let x = 0; x <= width / 2; x += scale) {
      ctx.moveTo(width / 2 + x, 0); ctx.lineTo(width / 2 + x, height);
      ctx.moveTo(width / 2 - x, 0); ctx.lineTo(width / 2 - x, height);
    }
    for (let y = 0; y <= height / 2; y += scale) {
      ctx.moveTo(0, height / 2 + y); ctx.lineTo(width, height / 2 + y);
      ctx.moveTo(0, height / 2 - y); ctx.lineTo(width, height / 2 - y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
    ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height);
    ctx.stroke();
  };

  // Draw obstacle zones
  const drawObstacleZones = (ctx: CanvasRenderingContext2D, width: number, height: number, scale: number, time: number) => {
    for (const zone of obstacleZones.current) {
      const px = width / 2 + zone.gridX * scale;
      const py = height / 2 - zone.gridY * scale;
      
      // Pulsing red glow
      const pulse = 0.5 + 0.5 * Math.sin(time / 300);
      const alpha = 0.4 + pulse * 0.3;
      
      ctx.save();
      ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
      ctx.strokeStyle = `rgba(255, 80, 80, ${alpha + 0.3})`;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15 + pulse * 10;
      ctx.shadowColor = '#FF3333';
      
      // Draw grid cell - doubled size (area = 4x, side * 2)
      const halfCell = scale; // was scale/2, now scale (side * 2)
      ctx.fillRect(px - halfCell + 2, py - halfCell + 2, halfCell * 2 - 4, halfCell * 2 - 4);
      ctx.strokeRect(px - halfCell + 2, py - halfCell + 2, halfCell * 2 - 4, halfCell * 2 - 4);
      
      // Draw warning icon (X pattern) - scaled up
      const margin = halfCell * 0.2;
      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px - halfCell + margin, py - halfCell + margin);
      ctx.lineTo(px + halfCell - margin, py + halfCell - margin);
      ctx.moveTo(px + halfCell - margin, py - halfCell + margin);
      ctx.lineTo(px - halfCell + margin, py + halfCell - margin);
      ctx.stroke();
      
      ctx.restore();
    }
  };

  // Draw current curve
  const drawCurve = (ctx: CanvasRenderingContext2D, width: number, height: number, scale: number) => {
    ctx.strokeStyle = '#00FF41';
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (currentFormula.current.startsWith('constant_x:')) {
      const kVal = parseFloat(currentFormula.current.split(':')[1]);
      const px = width / 2 + kVal * scale;
      ctx.moveTo(px, -height);
      ctx.lineTo(px, height * 2);
      ctx.stroke();
      return;
    }

    let compiledFormula;
    try {
      compiledFormula = math.compile(currentFormula.current);
    } catch (e) {
      return;
    }

    let firstPoint = true;
    for (let px = 0; px < width; px += 2) {
      const graphX = (px - width / 2) / scale;
      
      try {
        const graphY = compiledFormula.evaluate({ x: graphX, e: Math.E });
        
        if (typeof graphY !== 'number' || isNaN(graphY)) continue;

        const py = height / 2 - graphY * scale;

        if (py < -height || py > height * 2) {
          firstPoint = true;
          continue;
        }

        if (firstPoint) {
          ctx.moveTo(px, py);
          firstPoint = false;
        } else {
          ctx.lineTo(px, py);
        }
      } catch (e) {
        firstPoint = true;
      }
    }
    ctx.stroke();
  };

  // Draw monsters
  const drawMonsters = (ctx: CanvasRenderingContext2D, width: number, height: number, scale: number, monsters: Monster[], time: number, speedMult: number) => {
    for (const m of monsters) {
      const deathTime = m.type === 'fast' ? 7000 : 10000;
      const progress = Math.min(1, m.age / deathTime);
      
      let r = 255, g = 176, b = 0;
      
      if (m.type === 'fast') {
        r = 255; g = 100; b = 0;
      } else if (m.type === 'durable') {
        r = 200; g = 0; b = 200;
      } else if (m.type === 'ghost') {
        r = 100; g = 200; b = 255;
      }
      
      r = Math.floor(r - (r - 150) * progress);
      g = Math.floor(g * (1 - progress));
      
      let pulseScale = 1;
      if (progress > 0.7) {
        pulseScale = 1 + 0.3 * Math.sin(m.age / 50); 
      } else {
        pulseScale = 1 + 0.2 * progress;
      }

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      
      const px = width / 2 + m.x * scale;
      const py = height / 2 - m.y * scale;
      const pWidth = m.width * scale * pulseScale;
      const pHeight = m.height * scale * pulseScale;
      
      ctx.save();
      ctx.translate(px, py);

      if (m.type === 'fast') {
        ctx.beginPath();
        ctx.moveTo(0, -pHeight / 2);
        ctx.lineTo(pWidth / 2, pHeight / 2);
        ctx.lineTo(-pWidth / 2, pHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.fillRect(-pWidth / 6 - pWidth / 8, Math.max(0, pHeight / 4) - pHeight / 8, pWidth / 4, pHeight / 4);
        ctx.fillRect(pWidth / 6 - pWidth / 8, Math.max(0, pHeight / 4) - pHeight / 8, pWidth / 4, pHeight / 4);
      } else if (m.type === 'durable') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = Math.cos(angle) * pWidth / 1.5;
          const hy = Math.sin(angle) * pHeight / 1.5;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.fillRect(-pWidth / 3, -pHeight / 4, pWidth / 4, pHeight / 4);
        ctx.fillRect(pWidth / 12, -pHeight / 4, pWidth / 4, pHeight / 4);
      } else if (m.type === 'ghost') {
        ctx.beginPath();
        ctx.arc(0, 0, pWidth / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.fillRect(-pWidth / 4, -pHeight / 4, pWidth / 4, pHeight / 4);
        ctx.fillRect(pWidth / 8, -pHeight / 4, pWidth / 4, pHeight / 4);
      } else {
        ctx.fillRect(-pWidth / 2, -pHeight / 2, pWidth, pHeight);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(-pWidth / 4, -pHeight / 4, pWidth / 4, pHeight / 4);
        ctx.fillRect(pWidth / 8, -pHeight / 4, pWidth / 4, pHeight / 4);
      }
      
      ctx.restore();
    }
  };

  // Main game loop
  const update = useCallback((time: number) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const state = gameState.current;
    const dt = time - (state.lastTime || time);
    state.lastTime = time;
    
    let speedMult = difficulty === 'easy' ? 0.75 : difficulty === 'hard' ? 1.25 : 1.0;
    if (time < state.slowMotionEndTime) {
      speedMult *= 0.5;
    }

    // Initialize bg particles
    if (state.bgParticles.length === 0) {
      for (let i = 0; i < 50; i++) {
        state.bgParticles.push({
          x: (Math.random() - 0.5) * 12 * 1.5,
          y: (Math.random() - 0.5) * 12 * 1.5,
          vx: (Math.random() - 0.5) * 0.001,
          vy: (Math.random() - 0.5) * 0.001,
          life: 1,
          maxLife: 1,
          color: Math.random() > 0.8 ? '#00FF41' : '#003311'
        });
      }
    }

    // Update bg particles
    for (const p of state.bgParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      const halfW = 6 * 0.75;
      const halfH = 6 * 0.75;
      if (p.x > halfW) p.x = -halfW;
      if (p.x < -halfW) p.x = halfW;
      if (p.y > halfH) p.y = -halfH;
      if (p.y < -halfH) p.y = halfH;
    }

    // Spawn logic
    if (time - state.lastSpawnTime > (state.spawnInterval / speedMult / 0.66)) {
      state.lastSpawnTime = time;
      state.spawnInterval = Math.max(800, state.spawnInterval * 0.98);
      
      const specialRatio = difficulty === 'easy' ? 0.25 : difficulty === 'medium' ? 0.35 : 0.40;
      
      let type: 'normal' | 'fast' | 'durable' | 'ghost' = 'normal';
      
      // Pressure mode: replace normal monsters with special ones
      if (hasPressure) {
        const replaceRatio = dlcConfig.pressureLevel / 3; // 1/3, 2/3, or 1
        if (Math.random() < replaceRatio) {
          const types = ['fast', 'durable', 'ghost'] as const;
          type = types[Math.floor(Math.random() * types.length)];
        }
      } else if (Math.random() < specialRatio) {
        const types = ['fast', 'durable', 'ghost'] as const;
        type = types[Math.floor(Math.random() * types.length)];
      }

      state.monsters.push({
        id: Math.random().toString(),
        x: (Math.random() - 0.5) * 12 * 0.9,
        y: (Math.random() - 0.5) * 12 * 0.9,
        width: 1,
        height: 1,
        age: 0,
        hasPlayedWarning: false,
        type,
        hp: type === 'durable' ? 3 : 1,
        maxHp: type === 'durable' ? 3 : 1
      });
    }

    // Spawn power-ups
    if (time - state.lastPowerUpSpawnTime > 45000 + Math.random() * 30000) {
      state.lastPowerUpSpawnTime = time;
      
      const pType = Math.random() > 0.5 ? 'slow_motion' : 'screen_clear';
      const initialHp = pType === 'screen_clear' ? 3 : 2;
      
      state.powerUps.push({
        id: Math.random().toString(),
        x: (Math.random() - 0.5) * 12 * 0.8,
        y: (Math.random() - 0.5) * 12 * 0.8,
        radius: 0.6,
        type: pType,
        hp: initialHp,
        maxHp: initialHp,
        age: 0
      });
    }

    // Move monsters
    const newMonsters: Monster[] = [];
    let healthLost = 0;
    
    for (const m of state.monsters) {
      m.age += dt * speedMult * 0.66;
      const deathTime = m.type === 'fast' ? 7000 : 10000;
      const warningTime = m.type === 'fast' ? 4900 : 7000;
      
      if (m.age >= warningTime && !m.hasPlayedWarning) {
        audio.playWarning();
        m.hasPlayedWarning = true;
      }
      
      if (m.age >= deathTime) {
        healthLost++;
        
        state.shakeTime = 400;
        state.shakeIntensity = 15;
        
        for (let j = 0; j < 80; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 0.15 + 0.05;
          state.particles.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 800 + Math.random() * 500,
            maxLife: 1300,
            color: '#FF3D00'
          });
        }
      } else {
        newMonsters.push(m);
      }
    }
    
    state.monsters = newMonsters;
    
    // Update power-ups
    const newPowerUps: PowerUp[] = [];
    for (const p of state.powerUps) {
      p.age += dt * speedMult;
      if (p.age < 10000) {
        newPowerUps.push(p);
      }
    }
    state.powerUps = newPowerUps;
    
    if (healthLost > 0) {
      state.health -= healthLost;
      setHealth(state.health);
      audio.playEscape();
      if (state.health <= 0) {
        onGameOver(state.score);
        return;
      }
    }

    // Obstacle reposition every 10s
    if (hasObstacle && time - lastObstacleReposition.current > 10000) {
      lastObstacleReposition.current = time;
      obstacleZones.current = generateObstacleZones(dlcConfig.obstacleLevel);
    }

    // Update particles
    const newParticles: Particle[] = [];
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life > 0) {
        newParticles.push(p);
      }
    }
    state.particles = newParticles;

    if (state.shakeTime > 0) {
      state.shakeTime -= dt;
    } else {
      state.shakeTime = 0;
      state.shakeIntensity = 0;
    }

    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    if (state.shakeTime > 0) {
      const dx = (Math.random() - 0.5) * state.shakeIntensity;
      const dy = (Math.random() - 0.5) * state.shakeIntensity;
      ctx.translate(dx, dy);
    }

    // Scale to show exactly ±6 on both axes
    const scale = Math.min(canvas.width / 12, canvas.height / 12);
    
    // Draw bg particles
    for (const p of state.bgParticles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.5;
      const px = canvas.width / 2 + p.x * scale;
      const py = canvas.height / 2 - p.y * scale;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    drawCoordinateSystem(ctx, canvas.width, canvas.height, scale);
    drawCurve(ctx, canvas.width, canvas.height, scale);
    
    // Draw obstacle zones (retro tech sci-fi style, red restriction zones)
    drawObstacleZones(ctx, canvas.width, canvas.height, scale, time);
    
    drawMonsters(ctx, canvas.width, canvas.height, scale, state.monsters, time, speedMult);

    // Draw power-ups
    for (const p of state.powerUps) {
      const px = canvas.width / 2 + p.x * scale;
      const py = canvas.height / 2 - p.y * scale;
      const size = p.radius * scale;
      
      ctx.save();
      
      if (p.age > 7000) {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(p.age / 50);
      }
      
      ctx.translate(px, py);
      
      const pulse = 1 + 0.1 * Math.sin(time / 200);
      ctx.scale(pulse, pulse);

      ctx.save();
      if (p.type === 'slow_motion') {
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00FFFF';
        ctx.rotate(time / 1000);
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const hx = Math.cos(angle) * size;
          const hy = Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-size/2, -size/2);
        ctx.lineTo(size/2, -size/2);
        ctx.lineTo(-size/2, size/2);
        ctx.lineTo(size/2, size/2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#FF3D00';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FF3D00';
        
        ctx.rotate(Math.sin(time / 200) * 0.2);

        ctx.setLineDash([size * 0.5, size * 0.2]);
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const rectSize = size * 1.33;
        ctx.beginPath();
        ctx.rect(-rectSize/2, -rectSize/2, rectSize, rectSize);
        ctx.fillStyle = 'rgba(255, 61, 0, 0.15)';
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#FF3D00';
        ctx.beginPath();
        ctx.arc(0, 0, size/4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      
      if (p.hp < p.maxHp) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.hp.toString(), 0, 0);
      }
      
      ctx.restore();
    }

    // Draw particles
    for (const p of state.particles) {
      const progress = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = progress;
      const px = canvas.width / 2 + p.x * scale;
      const py = canvas.height / 2 - p.y * scale;
      ctx.beginPath();
      const radius = p.size ? (p.size * progress) : (4 * progress);
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    
    ctx.restore();

    requestRef.current = requestAnimationFrame(update);
  }, [onGameOver, difficulty, dlcConfig, hasPressure, hasObstacle, hasFervor]);

  // Start loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  // Check if a firing line hits an obstacle zone
  const checkObstacleHit = (compiledFormula: any, isConstantX: boolean, constantXVal: number): boolean => {
    for (const zone of obstacleZones.current) {
      // Doubled size: ±1 instead of ±0.5
      const leftX = zone.gridX - 1;
      const rightX = zone.gridX + 1;
      const bottomY = zone.gridY - 1;
      const topY = zone.gridY + 1;
      
      const samples = 10;
      for (let i = 0; i <= samples; i++) {
        const testX = leftX + (rightX - leftX) * (i / samples);
        try {
          if (isConstantX) {
            if (constantXVal >= leftX && constantXVal <= rightX) {
              return true;
            }
          } else {
            const testY = compiledFormula.evaluate({ x: testX, e: Math.E });
            if (typeof testY === 'number' && testY >= bottomY && testY <= topY) {
              return true;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
    return false;
  };

  // Handle Fire
  const handleFire = () => {
    const isConsecutiveTrig = (funcType === 'trigonometric' || funcType === 'tangent') && (lastUsedFunc === 'trigonometric' || lastUsedFunc === 'tangent');
    if (cooldown > 0 || formulaError || isConsecutiveTrig) return;
    
    let compiledFormula: any;
    let isConstantX = false;
    let constantXVal = 0;

    if (currentFormula.current.startsWith('constant_x:')) {
      isConstantX = true;
      constantXVal = parseFloat(currentFormula.current.split(':')[1]);
    } else {
      try {
        compiledFormula = math.compile(currentFormula.current);
      } catch (e) {
        return;
      }
    }
    
    audio.playLaser();

    const state = gameState.current;
    let hitCount = 0;
    const survivingMonsters: Monster[] = [];
    
    // 成就追踪：记录函数使用次数
    if (trackerRef.current) {
      trackerRef.current.funcUsageCount[funcType] = (trackerRef.current.funcUsageCount[funcType] || 0) + 1;
    }

    // Obstacle hit detection (single shot only deducts 1 hull)
    let obstacleHit = false;
    if (hasObstacle) {
      obstacleHit = checkObstacleHit(compiledFormula, isConstantX, constantXVal);
      if (obstacleHit) {
        state.health -= 1;
        setHealth(state.health);
        setObstacleHitFlash(true);
        setTimeout(() => setObstacleHitFlash(false), 400);
        audio.playEscape();
        
        // Red particles for obstacle hit
        for (const zone of obstacleZones.current) {
          for (let j = 0; j < 30; j++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.1 + 0.03;
            state.particles.push({
              x: zone.gridX,
              y: zone.gridY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 600 + Math.random() * 400,
              maxLife: 1000,
              color: '#FF3333',
              size: 3 + Math.random() * 3
            });
          }
        }
        
        if (state.health <= 0) {
          onGameOver(state.score);
          return;
        }
      }
    }

    // Collision detection with monsters
    for (const m of state.monsters) {
      const leftX = m.x - m.width / 2;
      const rightX = m.x + m.width / 2;
      const topY = m.y + m.height / 2;
      const bottomY = m.y - m.height / 2;
      
      let isHit = false;
      
      if (m.type === 'ghost' && (funcType === 'linear' || funcType === 'trigonometric' || funcType === 'tangent' || funcType === 'constant_x' || funcType === 'constant_y')) {
        isHit = false;
      } else {
        const samples = 10;
        for (let i = 0; i <= samples; i++) {
          const testX = leftX + (rightX - leftX) * (i / samples);
          try {
            if (isConstantX) {
               if (constantXVal >= leftX && constantXVal <= rightX) {
                   isHit = true;
                   break;
               }
            } else {
              const testY = compiledFormula.evaluate({ x: testX, e: Math.E });
              if (testY >= bottomY && testY <= topY) {
                isHit = true;
                break;
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (isHit) {
        m.hp--;
        
        for (let j = 0; j < 20; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 0.05 + 0.02;
          state.particles.push({
            x: m.x,
            y: m.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 500 + Math.random() * 500,
            maxLife: 1000,
            color: Math.random() > 0.5 ? '#00FF41' : '#FFFFFF',
            size: 4 + Math.random() * 4
          });
        }
        
        if (m.hp <= 0) {
          hitCount++;
        } else {
          survivingMonsters.push(m);
        }
      } else {
        survivingMonsters.push(m);
      }
    }

    state.monsters = survivingMonsters;

    // PowerUp Collision
    const survivingPowerUps: typeof state.powerUps = [];
    for (const p of state.powerUps) {
      const leftX = p.x - p.radius;
      const rightX = p.x + p.radius;
      const topY = p.y + p.radius;
      const bottomY = p.y - p.radius;
      
      let isHit = false;
      const samples = 10;
      for (let i = 0; i <= samples; i++) {
        const testX = leftX + (rightX - leftX) * (i / samples);
        try {
          if (isConstantX) {
             if (constantXVal >= leftX && constantXVal <= rightX) {
                 isHit = true;
                 break;
             }
          } else {
            const testY = compiledFormula.evaluate({ x: testX, e: Math.E });
            if (testY >= bottomY && testY <= topY) {
              isHit = true;
              break;
            }
          }
        } catch (e) {
        }
      }

      if (isHit) {
        p.hp--;
        for (let j = 0; j < 10; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 0.05 + 0.02;
          state.particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 300 + Math.random() * 300,
            maxLife: 600,
            color: '#FFFF00',
            size: 3
          });
        }

        if (p.hp <= 0) {
          audio.playHit();
          if (p.type === 'slow_motion') {
            state.slowMotionEndTime = state.lastTime + 10000;
          } else if (p.type === 'screen_clear') {
            state.shakeTime = 600;
            state.shakeIntensity = 30;
            setCssShake(true);
            setTimeout(() => setCssShake(false), 500);
            
            let bombKillCount = 0;
            for (const m of state.monsters) {
               for (let j = 0; j < 40; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 0.15 + 0.05;
                state.particles.push({
                  x: m.x,
                  y: m.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 800 + Math.random() * 500,
                  maxLife: 1300,
                  color: '#FF3D00'
                });
              }
              hitCount++;
              bombKillCount++;
            }
            state.monsters = [];
            // 成就追踪：记录炸弹击杀数
            if (trackerRef.current && bombKillCount > 0) {
              if (!trackerRef.current.maxKillsPerShot['bomb'] || bombKillCount > trackerRef.current.maxKillsPerShot['bomb']) {
                trackerRef.current.maxKillsPerShot['bomb'] = bombKillCount;
              }
            }
          }
        } else {
          survivingPowerUps.push(p);
        }
      } else {
        survivingPowerUps.push(p);
      }
    }
    state.powerUps = survivingPowerUps;

    if (hitCount > 0) {
      audio.playHit();
      const basePoints = hitCount * 10 * hitCount;
      const points = Math.floor(basePoints * finalScoreMultiplier);
      state.score += points;
      setScore(state.score);
      // 成就追踪：满血时最高分数
      if (trackerRef.current && state.health >= maxHealth && state.score > trackerRef.current.maxScoreWhileFullHealth) {
        trackerRef.current.maxScoreWhileFullHealth = state.score;
      }
      
      // 成就追踪：记录单次射击最大击杀数
      if (trackerRef.current) {
        const key = funcType;
        if (!trackerRef.current.maxKillsPerShot[key] || hitCount > trackerRef.current.maxKillsPerShot[key]) {
          trackerRef.current.maxKillsPerShot[key] = hitCount;
        }
      }
      
      setComboText({ text: hitCount > 1 ? `${hitCount}x ${lang === 'zh' ? '连击！' : 'COMBO!'} +${points}` : `${lang === 'zh' ? '命中！' : 'HIT!'} +${points}`, opacity: 1 });
      setTimeout(() => setComboText(null), 1500);

      if (hitCount > 1) {
        state.shakeTime = 300;
        state.shakeIntensity = hitCount * 5;
      }
    }

    // Start cooldown
    const isTrig = funcType === 'trigonometric' || funcType === 'tangent';
    setCooldown(isTrig ? baseTrigCooldown : baseCooldown);
    setLastUsedFunc(funcType);

    // P0: 发射后不清空参数，保留上次值以便微调后再次发射
  };

  const handleFireRef = useRef(handleFire);
  handleFireRef.current = handleFire;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === 'INPUT';
      
      if (isInput) {
        if (e.key === 'Enter') {
          handleFireRef.current();
          return;
        }
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
          return;
        }
      }
      
      const key = e.key.toLowerCase();
      
      const functionShortcuts = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'];
      const inputShortcuts = ['a', 's', 'd', 'f'];
      const actionShortcuts = ['enter', ' '];
      
      if (functionShortcuts.includes(key) || inputShortcuts.includes(key) || actionShortcuts.includes(key)) {
        if (isInput && key !== 'enter') {
          e.preventDefault();
        }
      } else {
        return;
      }

      switch (key) {
        case 'q': handleFuncChange('linear'); break;
        case 'w': handleFuncChange('quadratic'); break;
        case 'e': handleFuncChange('rational'); break;
        case 'r': handleFuncChange('power'); break;
        case 't': handleFuncChange('trigonometric'); break;
        case 'y': handleFuncChange('tangent'); break;
        case 'u': handleFuncChange('constant_x'); break;
        case 'i': handleFuncChange('constant_y'); break;
        
        case 'a':
          e.preventDefault();
          document.getElementById('param-input-0')?.focus();
          break;
        case 's':
          e.preventDefault();
          document.getElementById('param-input-1')?.focus();
          break;
        case 'd':
          e.preventDefault();
          document.getElementById('param-input-2')?.focus();
          break;
        case 'f':
          e.preventDefault();
          document.getElementById('param-input-3')?.focus();
          break;

        case 'enter':
        case ' ':
          if (!isInput) {
            e.preventDefault();
            handleFireRef.current();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFuncChange]);

  return (
    <div id="game-screen" className={`flex flex-col w-full h-full overflow-hidden ${cssShake ? 'animate-shake' : ''}`}>
      <header className="h-16 border-b border-[#00FF41]/30 flex items-center justify-between px-8 bg-[#001100]">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-[#00FF41] rounded-full shadow-[0_0_10px_#00FF41]"></div>
          <h1 className="text-xl font-bold tracking-widest text-[#00FF41] uppercase">{t.game_title}</h1>
          {/* DLC Mode Indicators */}
          {activeModes.map(mode => (
            <div key={mode} className="px-2 py-1 border border-[#FFB000]/50 bg-[#FFB000]/10 text-[#FFB000] text-[10px] font-mono uppercase tracking-wider">
              {mode === 'pressure' ? `PRESSURE Lv${dlcConfig.pressureLevel}` : 
               mode === 'obstacle' ? `OBSTACLE Lv${dlcConfig.obstacleLevel}` : 
               'FERVOR'}
              {' x'}{DLC_MULTIPLIERS[mode][mode === 'pressure' ? dlcConfig.pressureLevel - 1 : mode === 'obstacle' ? dlcConfig.obstacleLevel - 1 : 0].toFixed(1)}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-[#00FF41]/60" />
            <input 
              type="range" 
              min="0" max="1" step="0.01" 
              value={volume} 
              onChange={handleVolumeChange} 
              className="w-24 accent-[#00FF41]"
            />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-[#00FF41]/60 tracking-tighter">{t.game_hull}</span>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: maxHealth }).map((_, i) => (
                <div key={i} className={`w-6 h-2 ${i < health ? 'bg-[#00FF41]' : 'bg-[#00FF41]/20'}`}></div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-[#00FF41]/60 tracking-tighter">{t.game_score}</span>
            <span className="text-2xl font-mono text-[#64FEDA]">{score.toString().padStart(6, '0')}</span>
          </div>
          <button
            onClick={onQuit}
            className="flex items-center gap-2 px-3 py-2 border border-[#FF3D00]/60 bg-black hover:bg-[#FF3D00]/20 transition-colors text-[#FF3D00] font-mono text-xs uppercase tracking-wider"
          >
            <LogOut size={14} />
            {t.game_quit}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section className="relative flex-1 bg-[#050505] overflow-hidden" style={{ backgroundImage: 'radial-gradient(#00FF41 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center' }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-[2px] bg-[#00FF41]/20"></div>
            <div className="h-full w-[2px] bg-[#00FF41]/20"></div>
          </div>

          {/* Obstacle hit flash overlay */}
          {obstacleHitFlash && (
            <div className="absolute inset-0 bg-red-500/20 z-20 pointer-events-none transition-opacity duration-300"></div>
          )}

          <div className="absolute top-4 left-4 p-3 bg-black/80 border border-[#00FF41]/40 rounded-sm font-mono text-[12px] text-[#00FF41] pointer-events-none">
            <p>{t.game_target}</p>
            <p>{t.game_range}</p>
            <p>{t.game_velocity}</p>
            {activeModes.length > 0 && (
              <p className="text-[#FFB000] mt-1">{lang === 'zh' ? '倍率' : 'MULT'}: x{finalScoreMultiplier.toFixed(2)}</p>
            )}
          </div>

          {comboText && (
            <div className="absolute bottom-8 right-8 flex gap-2 items-end pointer-events-none">
              <div className="text-right mr-4">
                <p className="text-[#FFB000] text-xs font-bold uppercase mb-1 italic">{t.game_combo}</p>
                <p className="text-4xl font-black text-[#FFB000]">{comboText.text}</p>
              </div>
              <div className="w-16 h-32 bg-[#FFB000]/20 border border-[#FFB000] flex flex-col justify-end p-1">
                <div className="h-full bg-[#FFB000] w-full animate-pulse"></div>
              </div>
            </div>
          )}

          <canvas 
            ref={canvasRef} 
            className="w-full h-full bg-transparent relative z-10"
          />
        </section>

        <aside className="w-[26rem] bg-[#001100] border-l border-[#00FF41]/30 p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase text-[#00FF41] mb-2 tracking-widest">{t.game_module}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'linear', label: t.game_linear, key: 'Q' },
                  { value: 'quadratic', label: t.game_quad, key: 'W' },
                  { value: 'rational', label: t.game_rational, key: 'E' },
                  { value: 'power', label: t.game_pow, key: 'R' },
                  { value: 'trigonometric', label: t.game_trig, key: 'T' },
                  { value: 'tangent', label: t.game_tan, key: 'Y' },
                  { value: 'constant_x', label: t.game_const_x, key: 'U' },
                  { value: 'constant_y', label: t.game_const_y, key: 'I' }
                ].map((item) => {
                  const isTrigCooldown = (item.value === 'trigonometric' || item.value === 'tangent') && (lastUsedFunc === 'trigonometric' || lastUsedFunc === 'tangent');
                  return (
                  <button
                    key={item.value}
                    disabled={isTrigCooldown}
                    onClick={() => handleFuncChange(item.value as FunctionType)}
                    className={`text-left px-2 py-2 text-xs font-mono border transition-colors flex flex-col items-center justify-center text-center gap-1 ${
                      funcType === item.value 
                        ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]' 
                        : isTrigCooldown 
                          ? 'bg-black border-red-500/30 text-red-500/50 cursor-not-allowed'
                          : 'bg-[#000000] border-[#00FF41]/30 text-[#00FF41]/60 hover:border-[#00FF41]/60 hover:text-[#00FF41]'
                    }`}
                  >
                    <span className="leading-tight">{isTrigCooldown ? t.game_trig_cooldown : item.label}</span>
                    <span className="opacity-50 text-[10px] font-bold">[{item.key}]</span>
                  </button>
                )})}
              </div>
            </div>

            <div className="p-3 bg-black/50 border border-[#00FF41]/20 rounded-sm">
              <div className="mb-3 text-center font-mono text-[#64FEDA] truncate text-sm">y = {currentFormula.current}</div>
              {formulaError && (
                <div className="text-red-500 text-[10px] uppercase text-center mb-3 tracking-widest animate-pulse">
                  {lang === 'zh' ? '无效公式' : 'INVALID FORMULA'}
                </div>
              )}
              <div className="flex flex-col gap-4">
                {PARAMS_CONFIG[funcType].map((meta, index) => (
                  <ParamSlider
                    key={`${funcType}-${meta.key}`}
                    meta={meta}
                    value={params[meta.key] ?? ''}
                    id={`param-input-${index}`}
                    shortcut={['A', 'S', 'D', 'F'][index] ?? ''}
                    onChange={(v) => handleParamChange(meta.key, v)}
                  />
                ))}
              </div>
            </div>

            <button 
              onClick={handleFire}
              disabled={cooldown > 0 || formulaError !== null || ((funcType === 'trigonometric' || funcType === 'tangent') && (lastUsedFunc === 'trigonometric' || lastUsedFunc === 'tangent'))}
              className={`w-full py-3 font-black uppercase tracking-tighter transition-transform active:scale-[0.98] flex flex-col items-center justify-center ${
                cooldown > 0 || formulaError !== null || ((funcType === 'trigonometric' || funcType === 'tangent') && (lastUsedFunc === 'trigonometric' || lastUsedFunc === 'tangent'))
                  ? 'bg-black border border-[#FFB000]/50 text-[#FFB000]/50 cursor-not-allowed' 
                  : 'bg-[#FFB000] text-black hover:bg-[#ffc800]'
              }`}
            >
              <span>{
                cooldown > 0 
                  ? `${t.game_recharging} ${(cooldown/1000).toFixed(1)}s` 
                  : ((funcType === 'trigonometric' || funcType === 'tangent') && (lastUsedFunc === 'trigonometric' || lastUsedFunc === 'tangent'))
                    ? t.game_trig_cooldown
                    : formulaError 
                      ? t.game_invalid 
                      : t.game_fire
              }</span>
              {cooldown === 0 && !formulaError && !((funcType === 'trigonometric' || funcType === 'tangent') && (lastUsedFunc === 'trigonometric' || lastUsedFunc === 'tangent')) && <span className="text-[10px] opacity-70 font-mono mt-1 tracking-widest">[ENTER] or [SPACE]</span>}
            </button>
          </div>
        </aside>
      </main>
      
      <footer className="h-8 bg-[#00FF41] text-black text-[10px] font-bold flex items-center px-4 justify-between uppercase tracking-widest shrink-0">
        <span>{t.game_sys}</span>
        <span>{t.game_conn}</span>
        <span>{t.game_eng}</span>
      </footer>
    </div>
  );
}

