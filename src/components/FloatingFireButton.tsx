import React, { useMemo } from 'react';
import { Crosshair } from 'lucide-react';
import { useLongPressFire } from '../hooks/useLongPressFire';
import { FloatingButtonPosition, FloatingButtonTheme, FloatingButtonSize } from '../types';

interface FloatingFireButtonProps {
  enabled: boolean;
  position: FloatingButtonPosition;
  theme: FloatingButtonTheme;
  size: FloatingButtonSize;
  cooldown: number;
  maxCooldown: number;
  disabled: boolean;
  onFire: () => void;
  lang: 'en' | 'zh';
}

const SIZE_MAP = {
  sm: { btn: 48, icon: 20 },
  md: { btn: 60, icon: 24 },
  lg: { btn: 72, icon: 28 },
} as const;

const THEME_MAP = {
  amber: { bg: '#FFB000', ring: '#FFD700', text: '#000000', glow: 'rgba(255,176,0,0.6)' },
  green: { bg: '#00FF41', ring: '#66FF88', text: '#000000', glow: 'rgba(0,255,65,0.6)' },
  cyan: { bg: '#00FFFF', ring: '#66FFFF', text: '#000000', glow: 'rgba(0,255,255,0.6)' },
};

export function FloatingFireButton({
  enabled,
  position,
  theme,
  size,
  cooldown,
  maxCooldown,
  disabled,
  onFire,
}: FloatingFireButtonProps) {
  const { onPointerDown, onPointerUp, onPointerCancel, onPointerLeave } = useLongPressFire({
    cooldown,
    maxCooldown,
    disabled,
    onFire,
  });

  const progress = useMemo(() => {
    if (maxCooldown <= 0) return 1;
    const p = 1 - Math.min(1, Math.max(0, cooldown / maxCooldown));
    return p;
  }, [cooldown, maxCooldown]);

  const dims = SIZE_MAP[size];
  const colors = THEME_MAP[theme];

  const positionClass = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }[position];

  const radius = dims.btn / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  if (!enabled) return null;

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      disabled={disabled}
      className={`absolute ${positionClass} z-30 rounded-full flex items-center justify-center shadow-lg select-none`}
      style={{
        width: dims.btn,
        height: dims.btn,
        backgroundColor: disabled ? `${colors.bg}40` : colors.bg,
        color: colors.text,
        touchAction: 'manipulation',
        boxShadow: `0 0 16px ${colors.glow}, inset 0 0 12px rgba(255,255,255,0.3)`,
        opacity: disabled ? 0.6 : 1,
      }}
      aria-label="floating fire"
    >
      {/* SVG ring cooldown */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={dims.btn}
        height={dims.btn}
        style={{ pointerEvents: 'none' }}
      >
        <circle
          cx={radius}
          cy={radius}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={3}
        />
        <circle
          cx={radius}
          cy={radius}
          r={radius}
          fill="none"
          stroke={colors.ring}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>

      <Crosshair size={dims.icon} strokeWidth={2.5} className="relative z-10" />
    </button>
  );
}