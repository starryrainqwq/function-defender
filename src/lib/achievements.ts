/**
 * 成就系统核心管理模块
 * 负责成就数据的计算、级别判定、持久化存储与同步
 */
import {
  AchievementId,
  AchievementLevel,
  AchievementData,
  AchievementState,
  ACHIEVEMENT_CONFIGS,
  createDefaultAchievementState,
  FunctionType,
} from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// 本地存储键名
const LOCAL_STORAGE_KEY = 'fd_achievements';

// ==================== 成就进度追踪器（单局游戏内使用） ====================

/**
 * 单局游戏内的成就进度追踪器
 * 在游戏开始时创建，游戏过程中持续更新，游戏结束时用于结算
 */
export interface SessionAchievementTracker {
  /** 各函数类型的使用次数 */
  funcUsageCount: Record<FunctionType, number>;
  /** 单次射击最大击杀数（按函数类型分开） */
  maxKillsPerShot: Record<string, number>;
  /** 满血时达到的最高分数（用于绝对领域场成就判定） */
  maxScoreWhileFullHealth: number;
  /** 当前血量（用于判断是否满血） */
  currentHealth: number;
  /** 最大血量 */
  maxHealth: number;
}

export function createSessionTracker(maxHealth: number): SessionAchievementTracker {
  return {
    funcUsageCount: {
      linear: 0,
      quadratic: 0,
      rational: 0,
      power: 0,
      trigonometric: 0,
      tangent: 0,
      constant_x: 0,
      constant_y: 0,
    },
    maxKillsPerShot: {},
    maxScoreWhileFullHealth: 0,
    currentHealth: maxHealth,
    maxHealth,
  };
}

// ==================== 成就管理器 ====================

export class AchievementManager {
  private state: AchievementState;
  private userId: string | null;
  private savePending: boolean = false;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.state = createDefaultAchievementState();
    this.userId = null;
  }

  /** 获取当前成就状态（只读） */
  getState(): Readonly<AchievementState> {
    return this.state;
  }

  /** 获取指定成就的数据 */
  getAchievement(id: AchievementId): Readonly<AchievementData> {
    return this.state.achievements[id];
  }

  /** 从本地存储加载成就数据 */
  loadFromLocal(): boolean {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AchievementState;
        // 合并确保所有成就都存在
        this.state = this.mergeWithDefaults(parsed);
        return true;
      }
    } catch (e) {
      console.error('Failed to load achievements from local storage:', e);
    }
    return false;
  }

  /** 保存到本地存储 */
  saveToLocal(): void {
    try {
      // 不保存 newlyUnlocked 到本地
      const toSave = {
        achievements: this.state.achievements,
        newlyUnlocked: [],
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save achievements to local storage:', e);
    }
  }

  /** 从Firebase加载成就数据 */
  async loadFromFirebase(userId: string): Promise<void> {
    this.userId = userId;
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.achievements) {
          this.state = this.mergeWithDefaults(data.achievements as AchievementState);
        }
      }
    } catch (e) {
      console.error('Failed to load achievements from Firebase:', e);
    }
    // 同时从本地加载作为fallback
    this.loadFromLocal();
    // 取本地和云端中进度较高的
    this.takeMaxWithLocal();
    // 保存到本地
    this.saveToLocal();
  }

  /** 保存成就到Firebase（防抖） */
  async saveToFirebase(): Promise<void> {
    if (!this.userId) return;
    this.savePending = true;
    // 防抖：500ms内的多次调用只执行最后一次
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      try {
        const docRef = doc(db, 'users', this.userId!);
        await setDoc(docRef, {
          achievements: {
            achievements: this.state.achievements,
            newlyUnlocked: [],
          },
        }, { merge: true });
        this.savePending = false;
      } catch (e) {
        console.error('Failed to save achievements to Firebase:', e);
        this.savePending = false;
      }
    }, 500);
    // 同时保存到本地
    this.saveToLocal();
  }

  /** 设置用户ID */
  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  /**
   * 处理单局游戏结束后的成就结算
   * @param tracker 单局游戏追踪器
   * @returns 新解锁的成就列表
   */
  settleSession(tracker: SessionAchievementTracker): { id: AchievementId; level: AchievementLevel }[] {
    this.state.newlyUnlocked = [];

    // 1. 精准迫击炮：二次函数单次消灭
    this.checkThresholdAchievement(
      'precision_mortar',
      tracker.maxKillsPerShot['quadratic'] || 0,
    );

    // 2. 直来直去的浪漫：一次函数单次消灭
    this.checkThresholdAchievement(
      'straight_romance',
      tracker.maxKillsPerShot['linear'] || 0,
    );

    // 3. 全都可以炸完！：screen_clear炸弹单次消灭
    const bombKills = tracker.maxKillsPerShot['bomb'] || 0;
    this.checkThresholdAchievement('blow_it_all_up', bombKills);

    // 4. 绝对领域场：满血时达到的最高分数
    this.checkThresholdAchievement('at_field', tracker.maxScoreWhileFullHealth);

    // 5. 纯爱战神：单局内同种函数最大使用次数
    let maxFuncUsage = 0;
    for (const count of Object.values(tracker.funcUsageCount)) {
      if (count > maxFuncUsage) maxFuncUsage = count;
    }
    this.checkThresholdAchievement('pure_love_warrior', maxFuncUsage);

    // 保存
    this.saveToLocal();
    this.saveToFirebase();

    return [...this.state.newlyUnlocked];
  }

  /** 清除待展示的新解锁列表 */
  clearNewlyUnlocked(): void {
    this.state.newlyUnlocked = [];
  }

  /** 确保待保存的数据已写入 */
  async flush(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.savePending && this.userId) {
      try {
        const docRef = doc(db, 'users', this.userId);
        await setDoc(docRef, {
          achievements: {
            achievements: this.state.achievements,
            newlyUnlocked: [],
          },
        }, { merge: true });
        this.savePending = false;
      } catch (e) {
        console.error('Failed to flush achievements:', e);
      }
    }
  }

  // ==================== 私有方法 ====================

  /** 检查基于阈值的成就 */
  private checkThresholdAchievement(
    id: AchievementId,
    value: number,
  ): void {
    const data = this.state.achievements[id];
    const config = ACHIEVEMENT_CONFIGS.find(c => c.id === id);
    if (!config) return;

    // 更新最佳值
    if (value > data.bestValue) {
      data.bestValue = value;
    }

    // 更新当前值
    data.currentValue = value;

    // 检查是否能解锁新等级
    let newLevel = data.unlockedLevel;
    for (let i = config.thresholds.length - 1; i >= 0; i--) {
      if (value >= config.thresholds[i]) {
        newLevel = (i + 1) as AchievementLevel;
        break;
      }
    }

    // 如果解锁了新等级，记录
    if (newLevel > data.unlockedLevel) {
      // 逐级解锁
      for (let level = data.unlockedLevel + 1; level <= newLevel; level++) {
        data.unlockedLevel = level;
        this.state.newlyUnlocked.push({
          id,
          level: level as AchievementLevel,
        });
      }
    }
  }

  /** 合并数据，确保所有成就字段都存在 */
  private mergeWithDefaults(loaded: AchievementState): AchievementState {
    const defaults = createDefaultAchievementState();
    const merged = {
      achievements: { ...defaults.achievements },
      newlyUnlocked: loaded.newlyUnlocked || [],
    };

    if (loaded.achievements) {
      for (const config of ACHIEVEMENT_CONFIGS) {
        const loadedData = loaded.achievements[config.id];
        if (loadedData) {
          merged.achievements[config.id] = {
            id: config.id,
            unlockedLevel: Math.max(0, loadedData.unlockedLevel || 0),
            bestValue: Math.max(0, loadedData.bestValue || 0),
            currentValue: Math.max(0, loadedData.currentValue || 0),
          };
        }
      }
    }

    return merged;
  }

  /** 取本地和当前状态中进度较高的值 */
  private takeMaxWithLocal(): void {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const local = JSON.parse(raw) as AchievementState;
        if (local.achievements) {
          for (const config of ACHIEVEMENT_CONFIGS) {
            const localData = local.achievements[config.id];
            const currentData = this.state.achievements[config.id];
            if (localData && currentData) {
              currentData.unlockedLevel = Math.max(
                currentData.unlockedLevel,
                localData.unlockedLevel || 0,
              );
              currentData.bestValue = Math.max(
                currentData.bestValue,
                localData.bestValue || 0,
              );
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

/** 全局单例 */
export const achievementManager = new AchievementManager();