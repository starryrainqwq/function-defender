import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../lib/i18n';

interface TutorialScreenProps {
  onFinish: () => void;
  lang: Language;
}

const TUTORIAL_STEPS = [
  // Lens 1: Normal
  { text: '你好！我是小怪兽！', char: 'normal' },
  { text: '虽然我很可爱......但如果没有及时消灭我的话，我就会——', char: 'normal' },
  { text: '红温！', char: 'normal', highlight: true },
  { text: '自爆！', char: 'normal', shake: true },
  { text: '击穿你的装甲！', char: 'normal' },
  { text: '所以......', char: 'normal' },
  { text: '在我自爆之前，使用函数激光将我消灭吧！！！', char: 'normal' },
  { text: '争取获得更高分数，在排行榜上叱咤风云！', char: 'normal' },
  { text: '先别急，来认识一下我家大哥们。', char: 'normal' },
  
  // Lens 2: Fast
  { text: '人称 快男。暴脾气，自爆的速度是我的1.3倍', char: 'fast' },
  
  // Lens 3: Ghost
  { text: '超秀走位，普通的函数(线性函数、三角函数（正弦/正切）和常数函数（x/y）)奈何不了她', char: 'ghost' },
  
  // Lens 4: Durable
  { text: '血条超厚。需要你反复鞭尸才能将其消灭（未能击穿敌方装甲）', char: 'durable' },
  
  // Lens 5: All
  { text: '怎么样，是不是已经跃跃欲试了？', char: 'all' },
  { text: '那就来挑战我吧！', char: 'all' },
  { text: '【教学完成！快去开启函数激光对战吧！】', char: 'all', final: true },
];

const TUTORIAL_STEPS_EN = [
  { text: 'Hello! I am a little monster!', char: 'normal' },
  { text: 'Even though I look cute... if you don\'t destroy me in time, I will—', char: 'normal' },
  { text: 'Overheat!', char: 'normal', highlight: true },
  { text: 'Self-destruct!', char: 'normal', shake: true },
  { text: 'And pierce your armor!', char: 'normal' },
  { text: 'So...', char: 'normal' },
  { text: 'Before I self-destruct, destroy me using function lasers!!!', char: 'normal' },
  { text: 'Try to get a higher score and dominate the leaderboard!', char: 'normal' },
  { text: 'But wait, let me introduce you to my big brothers.', char: 'normal' },
  
  { text: 'Known as the Fast Guy. Short-tempered, self-destructs 1.3 times faster.', char: 'fast' },
  
  { text: 'Super evasive, ordinary functions (linear, trigonometric, and constant) can\'t touch her.', char: 'ghost' },
  
  { text: 'Super thick health bar. You need to hit him multiple times to destroy him.', char: 'durable' },
  
  { text: 'So, are you ready to give it a try?', char: 'all' },
  { text: 'Then come and challenge me!', char: 'all' },
  { text: '[Tutorial completed! Go and start the function laser battle!]', char: 'all', final: true },
];

export function TutorialScreen({ onFinish, lang }: TutorialScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [shake, setShake] = useState(false);
  const [fade, setFade] = useState(1);
  const [displayedChar, setDisplayedChar] = useState(TUTORIAL_STEPS[0].char);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const steps = lang === 'zh' ? TUTORIAL_STEPS : TUTORIAL_STEPS_EN;
  const currentStep = steps[stepIndex] || steps[steps.length - 1];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (fade === 0) return; // Prevent double pressing space during fade transition
        
        if (stepIndex < steps.length - 1) {
          const nextStep = steps[stepIndex + 1];
          if (nextStep && currentStep && nextStep.char !== currentStep.char) {
             setFade(0);
             setTimeout(() => {
               setStepIndex(prev => prev + 1);
               setDisplayedChar(nextStep.char);
               setFade(1);
             }, 300);
          } else {
             setStepIndex(prev => prev + 1);
          }
        } else {
          onFinish();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepIndex, steps, currentStep?.char, fade, onFinish]);

  useEffect(() => {
    if (currentStep.shake) {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();
    let particles: {x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number}[] = [];

    if (currentStep.shake) {
       for (let i = 0; i < 60; i++) {
           const angle = Math.random() * Math.PI * 2;
           const speed = Math.random() * 0.1 + 0.05;
           particles.push({
               x: canvas.width / 2,
               y: canvas.height / 2,
               vx: Math.cos(angle) * speed,
               vy: Math.sin(angle) * speed,
               life: 800 + Math.random() * 800,
               maxLife: 1600,
               size: 6 + Math.random() * 6
           });
       }
    }

    const drawMonster = (ctx: CanvasRenderingContext2D, type: string, x: number, y: number, time: number, scale: number = 1) => {
      const pWidth = 50 * scale;
      const pHeight = 50 * scale;
      
      // Bounce effect
      const bounce = Math.sin(time * 0.005) * 10;
      const py = y + bounce;
      const px = x;

      ctx.save();
      ctx.translate(px, py);

      ctx.fillStyle = '#96b012'; // Normal color
      if (currentStep.highlight || currentStep.shake) {
        ctx.fillStyle = '#FF3D00'; // Overheat color
      }

      if (type === 'fast') {
        ctx.beginPath();
        ctx.moveTo(0, -pHeight / 2);
        ctx.lineTo(pWidth / 2, pHeight / 2);
        ctx.lineTo(-pWidth / 2, pHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.fillRect(-pWidth / 6 - pWidth / 8, Math.max(0, pHeight / 4) - pHeight / 8, pWidth / 4, pHeight / 4);
        ctx.fillRect(pWidth / 6 - pWidth / 8, Math.max(0, pHeight / 4) - pHeight / 8, pWidth / 4, pHeight / 4);
      } else if (type === 'durable') {
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
      } else if (type === 'ghost') {
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
    };

    const render = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      if (!currentStep.shake) {
        if (displayedChar === 'all') {
          drawMonster(ctx, 'normal', cx - 120, cy, time, 0.8);
          drawMonster(ctx, 'fast', cx - 40, cy, time + 200, 0.8);
          drawMonster(ctx, 'ghost', cx + 40, cy, time + 400, 0.8);
          drawMonster(ctx, 'durable', cx + 120, cy, time + 600, 0.8);
        } else {
          drawMonster(ctx, displayedChar, cx, cy, time, 1.5);
        }
      }

      ctx.fillStyle = '#FF3D00';
      for (let i = particles.length - 1; i >= 0; i--) {
         const p = particles[i];
         p.x += p.vx * dt;
         p.y += p.vy * dt;
         p.life -= dt;
         if (p.life <= 0) {
            particles.splice(i, 1);
         } else {
            const progress = p.life / p.maxLife;
            ctx.globalAlpha = Math.max(0, progress);
            ctx.beginPath();
            const radius = p.size ? (p.size * progress) : (6 * progress);
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fill();
         }
      }
      ctx.globalAlpha = 1.0;

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationId);
  }, [currentStep, displayedChar]);

  return (
    <div 
      className={`flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#050505] ${shake ? 'animate-shake' : ''}`}
      style={{ backgroundImage: 'radial-gradient(#00FF41 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-20">
        <div className="w-full h-[2px] bg-[#00FF41]"></div>
        <div className="h-full w-[2px] bg-[#00FF41]"></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl h-[60vh] flex flex-col items-center justify-center">
        <canvas 
          ref={canvasRef}
          width={800}
          height={400}
          style={{ opacity: fade }}
          className="w-full h-full max-w-[800px] max-h-[400px] object-contain transition-opacity duration-300"
        />
      </div>

      <div className="relative z-20 w-full max-w-2xl bg-black/90 border border-[#00FF41]/60 p-6 shadow-[0_0_20px_rgba(0,255,65,0.2)] min-h-[120px] flex items-center justify-center transition-all duration-300">
        <p className={`text-xl md:text-2xl text-center font-mono tracking-wider transition-colors duration-300 ${currentStep.highlight ? 'text-[#FF3D00] font-black scale-110 drop-shadow-[0_0_10px_#FF3D00]' : currentStep.final ? 'text-[#FFB000] font-bold' : 'text-[#00FF41]'}`}>
          {currentStep.text}
        </p>
      </div>

      <div className="absolute bottom-8 right-8 z-20 opacity-60 animate-pulse text-[#00FF41] font-mono tracking-widest text-sm">
        {lang === 'zh' ? '按空格键继续 [SPACE]' : 'Press [SPACE] to continue'}
      </div>
    </div>
  );
}
