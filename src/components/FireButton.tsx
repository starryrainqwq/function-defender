import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface FireButtonProps {
  /** 是否禁用 */
  disabled: boolean;
  /** 当前冷却剩余时间 ms */
  cooldown: number;
  /** 总冷却时间 ms */
  maxCooldown: number;
  /** 按钮文字（可用状态） */
  label: string;
  /** 冷却中按钮文字 */
  cooldownLabel: string;
  /** 三角函数冷却中文字 */
  trigCooldownLabel: string;
  /** 公式无效文字 */
  invalidLabel: string;
  /** 是否因为三角函数连发被禁用 */
  trigLocked: boolean;
  /** 是否公式无效 */
  invalid: boolean;
  /** 点击回调 */
  onClick: () => void;
  /** 冷却结束瞬间的回调（用于播放音效） */
  onCooldownReady?: () => void;
  /** 子节点：显示在按钮文字下方的快捷键提示 */
  shortcutHint?: React.ReactNode;
}

interface Spark {
  id: string;
  left: number;
  top: number;
  color: string;
  txMid: number;
  txEnd: number;
  duration: number;
}

const SEGMENT_COUNT = 12;

export function FireButton({
  disabled,
  cooldown,
  maxCooldown,
  label,
  cooldownLabel,
  trigCooldownLabel,
  invalidLabel,
  trigLocked,
  invalid,
  onClick,
  onCooldownReady,
  shortcutHint,
}: FireButtonProps): React.JSX.Element {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [flash, setFlash] = useState(false);
  const prevCooldownRef = useRef(cooldown);
  const sparkIdRef = useRef(0);
  const sparkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = useMemo(() => {
    if (maxCooldown <= 0) return 0;
    return 1 - Math.min(1, Math.max(0, cooldown / maxCooldown));
  }, [cooldown, maxCooldown]);

  const filledSegments = useMemo(
    () => Math.floor(progress * SEGMENT_COUNT),
    [progress]
  );

  // Detect cooldown just finished
  useEffect(() => {
    if (prevCooldownRef.current > 0 && cooldown === 0) {
      setFlash(true);
      onCooldownReady?.();
      const timer = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(timer);
    }
    prevCooldownRef.current = cooldown;
  }, [cooldown, onCooldownReady]);

  // Generate sparks during cooldown
  useEffect(() => {
    if (cooldown <= 0 || maxCooldown <= 0) {
      if (sparkTimerRef.current) {
        clearTimeout(sparkTimerRef.current);
        sparkTimerRef.current = null;
      }
      setSparks([]);
      return;
    }

    const scheduleNext = () => {
      sparkTimerRef.current = setTimeout(() => {
        setSparks((prev) => {
          const next = prev.filter((s) => {
            // keep sparks that are still likely animating; max duration 0.7s
            const age = Date.now() - Number(s.id.split('-')[1]);
            return age < 800;
          });
          const tipProgress = 1 - cooldown / maxCooldown;
          const baseLeft = Math.max(0, Math.min(100, tipProgress * 100));
          const sparkCount = Math.random() < 0.6 ? 1 : 2;
          for (let i = 0; i < sparkCount; i++) {
            const left = baseLeft + (Math.random() - 0.5) * 8;
            const top = Math.random() * 4 - 2;
            const txMid = (Math.random() - 0.5) * 24;
            const txEnd = txMid + (Math.random() - 0.5) * 18;
            next.push({
              id: `${sparkIdRef.current++}-${Date.now()}`,
              left: Math.max(0, Math.min(100, left)),
              top,
              color: Math.random() > 0.5 ? '#FFD700' : '#FFFFFF',
              txMid,
              txEnd,
              duration: 0.5 + Math.random() * 0.25,
            });
          }
          return next.slice(-20);
        });
        if (cooldown > 0) scheduleNext();
      }, 80 + Math.random() * 120);
    };

    scheduleNext();

    return () => {
      if (sparkTimerRef.current) clearTimeout(sparkTimerRef.current);
    };
  }, [cooldown, maxCooldown]);

  const isCooling = cooldown > 0;

  const buttonClass = disabled
    ? 'bg-black border border-[#FFB000]/50 text-[#FFB000]/50 cursor-not-allowed'
    : 'bg-[#FFB000] text-black hover:bg-[#ffc800] animate-[fire-btn-idle_2s_ease-in-out_infinite]';

  const bracketColor = disabled ? 'text-[#FFB000]/50' : 'text-[#FFB000]';

  const buttonText = isCooling
    ? `${cooldownLabel} ${(cooldown / 1000).toFixed(1)}s`
    : trigLocked
    ? trigCooldownLabel
    : invalid
    ? invalidLabel
    : label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full py-3 font-black uppercase tracking-tighter transition-transform active:scale-[0.98] flex flex-col items-center justify-center overflow-hidden ${buttonClass}`}
    >
      {/* Corner brackets */}
      <span
        className={`fx-corner-bracket tl ${bracketColor}`}
        style={{ borderColor: 'currentColor' }}
      />
      <span
        className={`fx-corner-bracket tr ${bracketColor}`}
        style={{ borderColor: 'currentColor' }}
      />
      <span
        className={`fx-corner-bracket bl ${bracketColor}`}
        style={{ borderColor: 'currentColor' }}
      />
      <span
        className={`fx-corner-bracket br ${bracketColor}`}
        style={{ borderColor: 'currentColor' }}
      />

      {/* Charge-complete flash overlay */}
      {flash && (
        <div
          className="absolute inset-0 bg-[#00FF41] pointer-events-none"
          style={{ animation: 'bar-charge-flash 0.6s ease-out forwards' }}
        />
      )}

      {/* Button text */}
      <span className="relative z-10">{buttonText}</span>
      {!isCooling && !trigLocked && !invalid && !disabled && shortcutHint && (
        <span className="relative z-10 text-[10px] opacity-70 font-mono mt-1 tracking-widest">
          {shortcutHint}
        </span>
      )}

      {/* Energy bar */}
      <div className="absolute bottom-1 left-2 right-2 h-1 flex z-10">
        {Array.from({ length: SEGMENT_COUNT }).map((_, i) => {
          const isActive = i < filledSegments;
          const isTip = isActive && i === filledSegments - 1;
          return (
            <div
              key={i}
              className={`fx-energy-bar-segment ${isActive ? 'active' : ''} ${
                isTip ? 'pulse-tip' : ''
              }`}
            />
          );
        })}
      </div>

      {/* Sparks */}
      {sparks.map((s) => (
        <span
          key={s.id}
          className="fx-fire-spark"
          style={{
            left: `${s.left}%`,
            bottom: `${2 + s.top}px`,
            backgroundColor: s.color,
            boxShadow: `0 0 6px ${s.color}, 0 0 12px ${s.color}`,
            ['--tx-mid' as string]: `${s.txMid}px`,
            ['--tx-end' as string]: `${s.txEnd}px`,
            ['--duration' as string]: `${s.duration}s`,
          }}
        />
      ))}
    </button>
  );
}
