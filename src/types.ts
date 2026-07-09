export type ScreenType = 'start' | 'game' | 'end' | 'tutorial';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface LeaderboardEntry {
  id: string;
  score: number;
  date: string;
}

export type FunctionType =
  | 'linear'
  | 'quadratic'
  | 'rational'
  | 'power'
  | 'trigonometric'
  | 'tangent'
  | 'constant_x'
  | 'constant_y';

export interface Monster {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  age: number;
  hasPlayedWarning: boolean;
  type: 'normal' | 'fast' | 'durable' | 'ghost';
  hp: number;
  maxHp: number;
}

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'slow_motion' | 'screen_clear';
  hp: number;
  maxHp: number;
  age: number;
}

// DLC Types - 多模式并行支持
export type DLCMode = 'none' | 'pressure' | 'obstacle' | 'fervor';
export type PressureLevel = 1 | 2 | 3;
export type ObstacleLevel = 1 | 2 | 3;

export interface DLCConfig {
  activeModes: DLCMode[];
  pressureLevel: PressureLevel;
  obstacleLevel: ObstacleLevel;
}

export interface RestrictionZone {
  gridX: number;
  gridY: number;
}

// DLC 倍率（乘法累积）- 各模式的各级别倍率
export const DLC_MULTIPLIERS: Record<DLCMode, number[]> = {
  none: [1.0],
  pressure: [1.5, 2.5, 3.5],
  obstacle: [1.5, 2.5, 3.5],
  fervor: [1.5],
};

// ==================== 成就系统类型定义 ====================

/** 成就ID */
export type AchievementId =
  | 'precision_mortar'      // 精准迫击炮：二次函数单次消灭
  | 'straight_romance'      // 直来直去的浪漫：一次函数单次消灭
  | 'blow_it_all_up'        // 全都可以炸完！：炸弹单次引爆
  | 'at_field'              // 绝对领域场：满血时达到指定分数阈值
  | 'pure_love_warrior';    // 纯爱战神：单局同种函数使用次数

/** 成就等级 1-5，5=MAX */
export type AchievementLevel = 1 | 2 | 3 | 4 | 5;

/** 单个成就的进度数据 */
export interface AchievementData {
  id: AchievementId;
  /** 当前已解锁的最高等级 (0 = 未解锁) */
  unlockedLevel: number;
  /** 最高纪录值（用于显示） */
  bestValue: number;
  /** 当前进度值（用于未解锁等级的进度展示） */
  currentValue: number;
}

/** 完整的成就状态 */
export interface AchievementState {
  achievements: Record<AchievementId, AchievementData>;
  /** 最近新解锁的成就列表（用于弹窗展示） */
  newlyUnlocked: { id: AchievementId; level: AchievementLevel }[];
}

/** 每个成就的配置信息 */
export interface AchievementConfig {
  id: AchievementId;
  nameKey: string;        // i18n key for name
  descKey: string;        // i18n key for description
  icon: string;           // emoji icon
  /** 各等级所需阈值，索引0对应等级1 */
  thresholds: number[];
  /** 单位显示文本 */
  unitKey: string;
}

/** 所有成就的静态配置 */
export const ACHIEVEMENT_CONFIGS: AchievementConfig[] = [
  {
    id: 'precision_mortar',
    nameKey: 'ach_precision_mortar_name',
    descKey: 'ach_precision_mortar_desc',
    icon: '🎯',
    thresholds: [2, 3, 4, 5, 6],
    unitKey: 'ach_unit_kills',
  },
  {
    id: 'straight_romance',
    nameKey: 'ach_straight_romance_name',
    descKey: 'ach_straight_romance_desc',
    icon: '💘',
    thresholds: [2, 3, 4, 5, 6],
    unitKey: 'ach_unit_kills',
  },
  {
    id: 'blow_it_all_up',
    nameKey: 'ach_blow_it_all_up_name',
    descKey: 'ach_blow_it_all_up_desc',
    icon: '💣',
    thresholds: [3, 5, 7, 9, 11],
    unitKey: 'ach_unit_kills',
  },
  {
    id: 'at_field',
    nameKey: 'ach_at_field_name',
    descKey: 'ach_at_field_desc',
    icon: '🛡️',
    thresholds: [1000, 3000, 5000, 7000, 9000],
    unitKey: 'ach_unit_damage',
  },
  {
    id: 'pure_love_warrior',
    nameKey: 'ach_pure_love_warrior_name',
    descKey: 'ach_pure_love_warrior_desc',
    icon: '⚔️',
    thresholds: [10, 15, 20, 25, 30],
    unitKey: 'ach_unit_times',
  },
];

/** 创建默认成就数据 */
export function createDefaultAchievementData(id: AchievementId): AchievementData {
  return {
    id,
    unlockedLevel: 0,
    bestValue: 0,
    currentValue: 0,
  };
}

/** 创建默认成就状态 */
export function createDefaultAchievementState(): AchievementState {
  const achievements = {} as Record<AchievementId, AchievementData>;
  for (const config of ACHIEVEMENT_CONFIGS) {
    achievements[config.id] = createDefaultAchievementData(config.id);
  }
  return {
    achievements,
    newlyUnlocked: [],
  };
}