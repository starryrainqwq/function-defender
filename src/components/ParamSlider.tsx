import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ParamMeta } from '../lib/paramConfig';

interface ParamSliderProps {
  meta: ParamMeta;
  value: string;
  id: string;
  shortcut: string;
  onChange: (value: string) => void;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatNum(n: number, step: number): string {
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return n.toFixed(decimals);
}

export function ParamSlider({ meta, value, id, shortcut, onChange }: ParamSliderProps) {
  const { key, label, defaultValue, min, max, step } = meta;
  const numericValue = useMemo(() => {
    if (value === '' || value === '-' || value === '.' || value === '-.') return 0;
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }, [value]);

  const [displayValue, setDisplayValue] = useState(value ?? '');
  useEffect(() => {
    setDisplayValue(value ?? '');
  }, [value]);

  // Throttled commit so curve redraws don't exceed ~60fps.
  const throttleRef = useRef<number | null>(null);
  const pendingValue = useRef<string | null>(null);

  const commit = useCallback(
    (raw: string) => {
      pendingValue.current = raw;
      if (throttleRef.current) return;
      throttleRef.current = window.setTimeout(() => {
        throttleRef.current = null;
        if (pendingValue.current !== null) {
          onChange(pendingValue.current);
          pendingValue.current = null;
        }
      }, 16);
    },
    [onChange]
  );

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDisplayValue(v);
    commit(v);
  };

  const handleRangePointerUp = () => {
    if (pendingValue.current !== null) {
      onChange(pendingValue.current);
      pendingValue.current = null;
    }
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // Keep existing validation: allow empty, '-', '.', '-.' and valid numbers.
    if (v === '' || v === '-' || v === '.' || v === '-.' || !isNaN(Number(v))) {
      setDisplayValue(v);
      onChange(v);
    }
  };

  const handleDoubleClick = () => {
    const v = formatNum(defaultValue, step);
    setDisplayValue(v);
    onChange(v);
  };

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const current = numericValue;
      const delta = e.deltaY > 0 ? -step : step;
      const next = clamp(Number(formatNum(current + delta, step)), min, max);
      const v = formatNum(next, step);
      setDisplayValue(v);
      onChange(v);
    },
    [numericValue, step, min, max, onChange]
  );

  useEffect(() => {
    const el = document.getElementById(`slider-${id}`);
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, id]);

  // Range progress for inline gradient (0-100%)
  const progress = useMemo(() => {
    if (max === min) return 0;
    return ((clamp(numericValue, min, max) - min) / (max - min)) * 100;
  }, [numericValue, min, max]);

  const ticks = useMemo(() => {
    const list: number[] = [];
    const start = Math.ceil(min);
    const end = Math.floor(max);
    for (let i = start; i <= end; i++) {
      list.push(i);
    }
    return list;
  }, [min, max]);

  return (
    <div className="flex flex-col gap-1 w-full select-none">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-mono text-[#00FF41]/80">
          {label} <span className="opacity-50">[{shortcut}]</span>
        </label>
        <input
          id={id}
          type="number"
          step={step}
          value={displayValue}
          onChange={handleNumberChange}
          className="w-20 bg-black border border-[#00FF41]/30 text-right p-1 font-mono text-sm text-[#00FF41] outline-none focus:border-[#00FF41] focus:shadow-[0_0_8px_rgba(0,255,65,0.4)]"
        />
      </div>

      <div className="relative h-8 flex items-center">
        {/* Tick marks */}
        {ticks.map((t) => {
          const pct = ((t - min) / (max - min)) * 100;
          return (
            <div
              key={t}
              className="absolute top-1/2 -translate-y-1/2 w-[1px] h-3 bg-[#00FF41]/20 pointer-events-none"
              style={{ left: `${pct}%`, transform: `translateX(-50%) translateY(-50%)` }}
            />
          );
        })}

        <input
          id={`slider-${id}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamp(numericValue, min, max)}
          onChange={handleRangeChange}
          onPointerUp={handleRangePointerUp}
          onMouseUp={handleRangePointerUp}
          onTouchEnd={handleRangePointerUp}
          onDoubleClick={handleDoubleClick}
          tabIndex={-1}
          className="param-slider w-full z-10"
          style={{
            background: `linear-gradient(to right, #00FF41 0%, #00FF41 ${progress}%, #001100 ${progress}%, #001100 100%)`,
          }}
          aria-label={`${label} slider`}
        />
      </div>

      <div className="flex justify-between text-[10px] font-mono text-[#00FF41]/40 px-1">
        <span>{formatNum(min, step)}</span>
        <span>{formatNum(max, step)}</span>
      </div>
    </div>
  );
}
