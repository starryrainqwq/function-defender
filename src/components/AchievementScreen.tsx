import React from 'react';
import { ArrowLeft, Trophy, Lock, Star } from 'lucide-react';
import { Language, i18n } from '../lib/i18n';
import {
  AchievementId,
  AchievementData,
  ACHIEVEMENT_CONFIGS,
} from '../types';

interface AchievementScreenProps {
  lang: Language;
  onBack: () => void;
  getAchievement: (id: AchievementId) => Readonly<AchievementData>;
}

export function AchievementScreen({ lang, onBack, getAchievement }: AchievementScreenProps) {
  const t = i18n[lang];

  const getLevelColor = (level: number, maxLevel: number): string => {
    if (level >= maxLevel) return '#FFB000';
    if (level >= 3) return '#00FF41';
    if (level >= 1) return '#00FFFF';
    return '#333';
  };

  const getLevelText = (level: number, maxLevel: number): string => {
    if (level >= maxLevel) return t.ach_level_max;
    return `${t.ach_level}${level}`;
  };

  const renderStars = (level: number, maxLevel: number) => {
    const stars = [];
    for (let i = 0; i < maxLevel; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          className={i < level ? 'text-[#FFB000]' : 'text-[#333]'}
          fill={i < level ? '#FFB000' : 'transparent'}
        />
      );
    }
    return stars;
  };

  const hasAnyUnlock = ACHIEVEMENT_CONFIGS.some(
    config => getAchievement(config.id).unlockedLevel > 0
  );

  return (
    <div
      className="flex-1 flex flex-col items-center relative overflow-hidden bg-[#050505]"
      style={{
        backgroundImage: 'radial-gradient(#00FF41 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        backgroundPosition: 'center',
      }}
    >
      {/* 坐标轴 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-full h-[2px] bg-[#00FF41]/20"></div>
        <div className="h-full w-[2px] bg-[#00FF41]/20"></div>
      </div>

      {/* 顶部栏 */}
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-black/80 p-3 border border-[#00FF41]/40 hover:bg-[#00FF41]/10 transition-colors"
        >
          <ArrowLeft size={18} className="text-[#00FF41]" />
          <span className="text-[#00FF41] font-mono tracking-widest text-sm uppercase">
            {t.ach_back}
          </span>
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center p-4 md:p-8 bg-black/80 border border-[#00FF41]/40 shadow-[0_0_20px_rgba(0,255,65,0.2)] max-w-2xl w-full mx-4 my-16 max-h-[85vh] overflow-y-auto">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-6">
          <Trophy size={28} className="text-[#FFB000]" />
          <h1 className="text-2xl md:text-3xl font-black tracking-widest text-[#FFB000] uppercase">
            {t.ach_title}
          </h1>
        </div>

        {!hasAnyUnlock && (
          <div className="text-center py-8 text-[#00FF41]/40 font-mono text-sm">
            {t.ach_no_unlock}
          </div>
        )}

        {/* 成就列表 */}
        <div className="w-full space-y-4">
          {ACHIEVEMENT_CONFIGS.map((config) => {
            const data = getAchievement(config.id);
            const maxLevel = config.thresholds.length;
            const unlockedLevel = data.unlockedLevel;
            const levelColor = getLevelColor(unlockedLevel, maxLevel);

            // 下一个需要达到的阈值
            const nextThreshold =
              unlockedLevel < maxLevel
                ? config.thresholds[unlockedLevel]
                : config.thresholds[maxLevel - 1];

            return (
              <div
                key={config.id}
                className="p-4 border bg-black/60"
                style={{
                  borderColor: unlockedLevel > 0 ? `${levelColor}60` : '#333',
                  boxShadow:
                    unlockedLevel >= maxLevel
                      ? `0 0 15px rgba(255,176,0,0.15)`
                      : 'none',
                }}
              >
                <div className="flex items-start gap-3">
                  {/* 图标 */}
                  <div
                    className="text-3xl w-12 h-12 flex items-center justify-center border rounded"
                    style={{
                      borderColor: unlockedLevel > 0 ? levelColor : '#333',
                      background:
                        unlockedLevel > 0
                          ? `${levelColor}10`
                          : 'transparent',
                    }}
                  >
                    {config.icon}
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className="font-bold text-sm md:text-base truncate"
                        style={{ color: unlockedLevel > 0 ? levelColor : '#555' }}
                      >
                        {t[config.nameKey as keyof typeof t]}
                      </h3>
                      {unlockedLevel >= maxLevel && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#FFB000]/20 text-[#FFB000] border border-[#FFB000]/40">
                          MAX
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] md:text-xs text-[#00FF41]/40 font-mono mb-2">
                      {t[config.descKey as keyof typeof t]}
                    </p>

                    {/* 星级 */}
                    <div className="flex gap-1 mb-2">
                      {renderStars(unlockedLevel, maxLevel)}
                    </div>

                    {/* 进度条 */}
                    <div className="relative">
                      <div className="h-2 bg-[#111] border border-[#333] overflow-hidden">
                        {/* 已解锁部分 */}
                        {Array.from({ length: maxLevel }).map((_, i) => {
                          const threshold = config.thresholds[i];
                          const isUnlocked = i < unlockedLevel;
                          const segmentWidth = 100 / maxLevel;
                          return (
                            <div
                              key={i}
                              className="absolute top-0 h-full"
                              style={{
                                left: `${i * segmentWidth}%`,
                                width: `${segmentWidth}%`,
                                background: isUnlocked
                                  ? levelColor
                                  : 'transparent',
                                borderRight:
                                  i < maxLevel - 1
                                    ? '1px solid #333'
                                    : 'none',
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* 阈值标记 */}
                      <div className="flex justify-between mt-1">
                        {config.thresholds.map((threshold, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono"
                            style={{
                              color: i < unlockedLevel ? levelColor : '#555',
                            }}
                          >
                            {threshold}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 最佳记录 */}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#333]/50">
                      <span className="text-[10px] font-mono text-[#00FF41]/40">
                        {t.ach_best_record}:
                      </span>
                      <span
                        className="text-xs font-mono font-bold"
                        style={{ color: levelColor }}
                      >
                        {data.bestValue}{' '}
                        {t[config.unitKey as keyof typeof t]}
                      </span>
                    </div>

                    {/* 下一级目标 */}
                    {unlockedLevel < maxLevel && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] font-mono text-[#FF3D00]/40">
                          {lang === 'zh' ? '下一级' : 'Next'}:
                        </span>
                        <span className="text-[10px] font-mono text-[#FF3D00]/60">
                          {nextThreshold}{' '}
                          {t[config.unitKey as keyof typeof t]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}