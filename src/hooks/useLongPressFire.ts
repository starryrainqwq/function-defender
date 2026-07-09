import { useRef, useCallback, useEffect } from 'react';

export interface UseLongPressFireOptions {
  /** 当前剩余冷却 ms */
  cooldown: number;
  /** 总冷却 ms */
  maxCooldown: number;
  /** 是否处于不可用状态（如公式无效或三角锁） */
  disabled: boolean;
  /** 触发一次发射 */
  onFire: () => void;
  /** 长按进入连发模式的阈值 ms */
  longPressThreshold?: number;
}

export function useLongPressFire({
  cooldown,
  maxCooldown,
  disabled,
  onFire,
  longPressThreshold = 300,
}: UseLongPressFireOptions) {
  const rafRef = useRef<number | null>(null);
  const isPressedRef = useRef(false);
  const isLongPressRef = useRef(false);
  const longPressStartedRef = useRef(false);
  const lastFireTimeRef = useRef(0);
  const onFireRef = useRef(onFire);
  const cooldownRef = useRef(cooldown);
  const maxCooldownRef = useRef(maxCooldown);
  const disabledRef = useRef(disabled);

  onFireRef.current = onFire;
  cooldownRef.current = cooldown;
  maxCooldownRef.current = maxCooldown;
  disabledRef.current = disabled;

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const runLoop = useCallback(() => {
    if (!isPressedRef.current || disabledRef.current) {
      return;
    }

    const now = performance.now();
    const timeSinceLastFire = now - lastFireTimeRef.current;

    if (timeSinceLastFire >= maxCooldownRef.current && cooldownRef.current <= 0) {
      lastFireTimeRef.current = now;
      onFireRef.current();
    }

    rafRef.current = requestAnimationFrame(runLoop);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (disabledRef.current) return;

      isPressedRef.current = true;
      isLongPressRef.current = false;
      longPressStartedRef.current = false;

      // 立即发射一次，之后若按住超过阈值则进入连发
      lastFireTimeRef.current = performance.now();
      onFireRef.current();

      window.setTimeout(() => {
        if (isPressedRef.current && !longPressStartedRef.current) {
          longPressStartedRef.current = true;
          isLongPressRef.current = true;
          runLoop();
        }
      }, longPressThreshold);
    },
    [longPressThreshold, runLoop]
  );

  const handlePointerUp = useCallback(() => {
    isPressedRef.current = false;
    isLongPressRef.current = false;
    longPressStartedRef.current = false;
    stopLoop();
  }, [stopLoop]);

  const handlePointerCancel = useCallback(() => {
    isPressedRef.current = false;
    isLongPressRef.current = false;
    longPressStartedRef.current = false;
    stopLoop();
  }, [stopLoop]);

  const handlePointerLeave = useCallback(() => {
    isPressedRef.current = false;
    isLongPressRef.current = false;
    longPressStartedRef.current = false;
    stopLoop();
  }, [stopLoop]);

  useEffect(() => {
    const handleBlur = () => {
      isPressedRef.current = false;
      isLongPressRef.current = false;
      longPressStartedRef.current = false;
      stopLoop();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPressedRef.current = false;
        isLongPressRef.current = false;
        longPressStartedRef.current = false;
        stopLoop();
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopLoop();
    };
  }, [stopLoop]);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerLeave,
  };
}