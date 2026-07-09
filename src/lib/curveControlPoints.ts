// P2: Canvas 曲线控制点拖拽 — 参数反算工具库
import { FunctionType } from '../types';
import { ParamMeta, clamp, formatNum } from './paramConfig';

export interface ControlPoint {
  /** 控制点对应的参数/语义 key */
  key: string;
  /** 显示标签 */
  label: string;
  /** 数学坐标 x（世界坐标） */
  graphX: number;
  /** 数学坐标 y（世界坐标） */
  graphY: number;
  /** 是否应渲染 */
  visible: boolean;
}

function parseNum(value: string | undefined, fallback = 0): number {
  if (value === undefined || value === '' || value === '-' || value === '.' || value === '-.') {
    return fallback;
  }
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

/** 获取当前函数类型在 canvas 上可拖拽的控制点 */
export function getControlPoints(
  type: FunctionType,
  params: Record<string, string>
): ControlPoint[] {
  switch (type) {
    case 'linear': {
      const b = parseNum(params.b);
      return [
        {
          key: 'b',
          label: '截距',
          graphX: 0,
          graphY: b,
          visible: true,
        },
      ];
    }

    case 'quadratic': {
      const a = parseNum(params.a);
      const b = parseNum(params.b);
      const c = parseNum(params.c);
      const visible = Math.abs(a) >= 0.05;
      const graphX = visible ? -b / (2 * a) : 0;
      const graphY = visible ? c - (b * b) / (4 * a) : 0;
      return [
        {
          key: 'vertex',
          label: '顶点',
          graphX,
          graphY,
          visible,
        },
      ];
    }

    case 'trigonometric': {
      const A = parseNum(params.A, 1);
      const w = parseNum(params.w, 1);
      const phi = parseNum(params.phi);
      const visible = Math.abs(w) >= 0.05;
      const graphX = visible ? (Math.PI / 2 - phi) / w : 0;
      const graphY = A;
      return [
        {
          key: 'peak',
          label: '波峰',
          graphX,
          graphY,
          visible,
        },
      ];
    }

    case 'constant_x': {
      const k = parseNum(params.k);
      return [
        {
          key: 'k',
          label: '位置',
          graphX: k,
          graphY: 0,
          visible: true,
        },
      ];
    }

    case 'constant_y': {
      const k = parseNum(params.k);
      return [
        {
          key: 'k',
          label: '位置',
          graphX: 0,
          graphY: k,
          visible: true,
        },
      ];
    }

    case 'rational':
    case 'power':
    case 'tangent':
    default:
      return [];
  }
}

/** 给定当前类型、参数、鼠标数学坐标和要修改的参数 meta，返回需要更新的参数。 */
export function resolveDrag(
  type: FunctionType,
  params: Record<string, string>,
  graphX: number,
  graphY: number,
  meta: ParamMeta
): Partial<Record<string, string>> | null {
  switch (type) {
    case 'linear': {
      if (meta.key !== 'b') return null;
      return { b: formatNum(clamp(graphY, meta.min, meta.max), meta.step) };
    }

    case 'quadratic': {
      if (meta.key === 'a') return null; // 顶点拖拽不改变 a
      const a = parseNum(params.a);
      if (Math.abs(a) < 0.05) return null;

      const newB = -2 * a * graphX;
      const newC = graphY + (newB * newB) / (4 * a);

      const result: Partial<Record<string, string>> = {};
      result.b = formatNum(clamp(newB, -5, 5), 0.1);
      result.c = formatNum(clamp(newC, -5, 5), 0.1);
      return result;
    }

    case 'trigonometric': {
      if (meta.key === 'A') {
        return { A: formatNum(clamp(graphY, meta.min, meta.max), meta.step) };
      }
      if (meta.key === 'w') {
        const phi = parseNum(params.phi);
        if (Math.abs(graphX) < 0.02) return null;
        const newW = (Math.PI / 2 - phi) / graphX;
        return { w: formatNum(clamp(newW, meta.min, meta.max), meta.step) };
      }
      return null;
    }

    case 'constant_x': {
      if (meta.key !== 'k') return null;
      return { k: formatNum(clamp(graphX, meta.min, meta.max), meta.step) };
    }

    case 'constant_y': {
      if (meta.key !== 'k') return null;
      return { k: formatNum(clamp(graphY, meta.min, meta.max), meta.step) };
    }

    default:
      return null;
  }
}
