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
