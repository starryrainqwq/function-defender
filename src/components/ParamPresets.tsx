import React from 'react';
import { FunctionType } from '../types';
import {
  getPrimaryParamKey,
  zeroParams,
  randomizeParams,
} from '../lib/paramConfig';

export interface ParamPresetsProps {
  funcType: FunctionType;
  params: Record<string, string>;
  /** 应用新的参数 */
  onApply: (params: Record<string, string>) => void;
  /** 恢复上一次发射参数 */
  onRestoreLast: () => void;
  /** 是否存在可恢复的"上次"参数 */
  hasLast: boolean;
  lang: 'en' | 'zh';
}

const baseButtonClass =
  'flex-1 px-2 py-2 text-xs font-mono border border-[#00FF41]/40 bg-black text-[#00FF41] hover:bg-[#00FF41]/10 hover:border-[#00FF41] transition-colors uppercase tracking-wider';

export function ParamPresets({
  funcType,
  params,
  onApply,
  onRestoreLast,
  hasLast,
  lang,
}: ParamPresetsProps): React.JSX.Element {
  const primaryKey = getPrimaryParamKey(funcType);
  const hasPrimary = primaryKey !== '';

  const handleTogglePrimary = (magnitude: number) => {
    if (!hasPrimary) return;
    const current = Number(params[primaryKey] ?? 0);
    let next: number;
    if (current === magnitude) {
      next = -magnitude;
    } else if (current === -magnitude) {
      next = magnitude;
    } else {
      next = magnitude;
    }
    onApply({ ...params, [primaryKey]: next.toString() });
  };

  const lastButtonClass = hasLast
    ? baseButtonClass
    : baseButtonClass + ' opacity-50 cursor-not-allowed';

  const disabledPrimaryClass =
    baseButtonClass + ' opacity-40 cursor-not-allowed';

  const labels = {
    en: {
      zero: 'ZERO[Z]',
      last: 'LAST[X]',
      rand: 'RAND[C]',
    },
    zh: {
      zero: '零位[Z]',
      last: '上次[X]',
      rand: '随机[C]',
    },
  };

  return (
    <div className='flex flex-col gap-2 w-full'>
      <div className='flex gap-2'>
        {[1, 2, 3].map((n) =>
          hasPrimary ? (
            <button
              key={n}
              type='button'
              className={baseButtonClass}
              onClick={() => handleTogglePrimary(n)}
            >
              k=±{n}
            </button>
          ) : (
            <button
              key={n}
              type='button'
              className={disabledPrimaryClass}
              disabled
            >
              k=±{n}
            </button>
          )
        )}
      </div>
      <div className='flex gap-2'>
        <button
          type='button'
          className={baseButtonClass}
          onClick={() => onApply(zeroParams(funcType))}
        >
          {labels[lang].zero}
        </button>
        <button
          type='button'
          className={lastButtonClass}
          onClick={() => (hasLast ? onRestoreLast() : undefined)}
          disabled={!hasLast}
        >
          {labels[lang].last}
        </button>
        <button
          type='button'
          className={baseButtonClass}
          onClick={() => onApply(randomizeParams(funcType))}
        >
          {labels[lang].rand}
        </button>
      </div>
    </div>
  );
}
