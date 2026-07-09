import { FunctionType } from '../types';
import { i18n } from './i18n';

export const FUNCTION_LABEL_KEYS: Record<FunctionType, keyof typeof i18n.en> = {
  linear: 'game_linear',
  quadratic: 'game_quad',
  rational: 'game_rational',
  power: 'game_pow',
  trigonometric: 'game_trig',
  tangent: 'game_tan',
  constant_x: 'game_const_x',
  constant_y: 'game_const_y',
};

export const ALL_FUNCTIONS: { value: FunctionType; labelKey: keyof typeof i18n.en }[] = [
  { value: 'linear', labelKey: 'game_linear' },
  { value: 'quadratic', labelKey: 'game_quad' },
  { value: 'rational', labelKey: 'game_rational' },
  { value: 'power', labelKey: 'game_pow' },
  { value: 'trigonometric', labelKey: 'game_trig' },
  { value: 'tangent', labelKey: 'game_tan' },
  { value: 'constant_x', labelKey: 'game_const_x' },
  { value: 'constant_y', labelKey: 'game_const_y' },
];
