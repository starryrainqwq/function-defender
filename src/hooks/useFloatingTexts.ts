import { useState, useCallback, useRef } from 'react';

export interface FloatingText {
  id: string;
  /** canvas 屏幕坐标 x（px） */
  x: number;
  y: number;
  text: string;
  color: string;
  scale: number;
  createdAt: number;
}

export interface UseFloatingTextsReturn {
  texts: FloatingText[];
  /** 添加一条浮动文字，最多保留 10 条，旧的会被移除 */
  add: (item: Omit<FloatingText, 'id' | 'createdAt'>) => void;
  /** 手动清理（可选） */
  clear: () => void;
}

export function useFloatingTexts(maxCount: number = 10): UseFloatingTextsReturn {
  const [texts, setTexts] = useState<FloatingText[]>([]);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const removeById = useCallback((id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((item: Omit<FloatingText, 'id' | 'createdAt'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newText: FloatingText = {
      ...item,
      id,
      createdAt: Date.now(),
    };

    setTexts((prev) => {
      const next = [...prev];
      if (next.length >= maxCount) {
        next.shift();
      }
      next.push(newText);
      return next;
    });

    const timer = setTimeout(() => {
      removeById(id);
    }, 1600);

    timersRef.current.add(timer);
  }, [maxCount, removeById]);

  const clear = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setTexts([]);
  }, []);

  return {
    texts,
    add,
    clear,
  };
}
