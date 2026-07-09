import { FunctionType } from '../types';

export interface ParamMeta {
  key: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}

export type FunctionParamsConfig = {
  type: FunctionType;
  params: ParamMeta[];
};

export const PARAMS_CONFIG: Record<FunctionType, ParamMeta[]> = {
  linear: [
    { key: 'k', label: 'k', defaultValue: 1, min: -5, max: 5, step: 0.1 },
    { key: 'b', label: 'b', defaultValue: 0, min: -5, max: 5, step: 0.1 },
  ],
  quadratic: [
    { key: 'a', label: 'a', defaultValue: 1, min: -3, max: 3, step: 0.1 },
    { key: 'b', label: 'b', defaultValue: 0, min: -5, max: 5, step: 0.1 },
    { key: 'c', label: 'c', defaultValue: 0, min: -5, max: 5, step: 0.1 },
  ],
  rational: [
    { key: 'k', label: 'k', defaultValue: 1, min: -5, max: 5, step: 0.1 },
    { key: 'h', label: 'h', defaultValue: 0, min: -5, max: 5, step: 0.1 },
    { key: 'm', label: 'm', defaultValue: 0, min: -5, max: 5, step: 0.1 },
  ],
  power: [
    { key: 'a', label: 'a', defaultValue: 1, min: -5, max: 5, step: 0.1 },
    { key: 'n', label: 'n', defaultValue: 2, min: 0.5, max: 5, step: 0.1 },
  ],
  trigonometric: [
    { key: 'A', label: 'A', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
    { key: 'w', label: 'w', defaultValue: 1, min: 0.5, max: 5, step: 0.1 },
    { key: 'phi', label: 'φ', defaultValue: 0, min: -3.14, max: 3.14, step: 0.1 },
  ],
  tangent: [
    { key: 'A', label: 'A', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
    { key: 'w', label: 'w', defaultValue: 1, min: 0.5, max: 5, step: 0.1 },
    { key: 'phi', label: 'φ', defaultValue: 0, min: -3.14, max: 3.14, step: 0.1 },
  ],
  constant_x: [
    { key: 'k', label: 'k', defaultValue: 0, min: -5, max: 5, step: 0.1 },
  ],
  constant_y: [
    { key: 'k', label: 'k', defaultValue: 0, min: -5, max: 5, step: 0.1 },
  ],
};

export function getDefaultParams(type: FunctionType): Record<string, string> {
  const params: Record<string, string> = {};
  for (const meta of PARAMS_CONFIG[type]) {
    params[meta.key] = meta.defaultValue.toString();
  }
  return params;
}

export function getParamMeta(type: FunctionType, key: string): ParamMeta | undefined {
  return PARAMS_CONFIG[type].find((p) => p.key === key);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function formatNum(n: number, step: number): string {
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return n.toFixed(decimals);
}

/**
 * 返回某函数类型的"主参数"key：
 * linear→k, quadratic→a, rational→k, power→a,
 * trigonometric/tangent→A, constant_x/constant_y→k
 */
export function getPrimaryParamKey(type: FunctionType): string {
  switch (type) {
    case 'linear':
    case 'rational':
    case 'constant_x':
    case 'constant_y':
      return 'k';
    case 'quadratic':
    case 'power':
      return 'a';
    case 'trigonometric':
    case 'tangent':
      return 'A';
    default:
      return '';
  }
}

/** 返回该函数类型下所有参数归零后的 Record<string,string>。
 *  若某参数 min>0，则取 min 值而非 0，避免落到无效范围。
 */
export function zeroParams(type: FunctionType): Record<string, string> {
  const params: Record<string, string> = {};
  for (const meta of PARAMS_CONFIG[type]) {
    const value = clamp(0, meta.min, meta.max);
    params[meta.key] = formatNum(value, meta.step);
  }
  return params;
}

/** 在该函数类型各参数的 min/max/step 范围内随机取值，并按 step 对齐。 */
export function randomizeParams(type: FunctionType): Record<string, string> {
  const params: Record<string, string> = {};
  for (const meta of PARAMS_CONFIG[type]) {
    const { min, max, step, key } = meta;
    const raw = Math.random() * (max - min) + min;
    const stepped = Math.round(raw / step) * step;
    const clamped = clamp(stepped, min, max);
    params[key] = formatNum(clamped, step);
  }
  return params;
}
