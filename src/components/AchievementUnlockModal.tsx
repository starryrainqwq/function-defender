import React, { useEffect, useState } from 'react';
import { Trophy, Star, X } from 'lucide-react';
import { Language, i18n } from '../lib/i18n';
import { AchievementId, AchievementLevel, ACHIEVEMENT_CONFIGS } from '../types';

interface UnlockEntry {
  id: AchievementId;
  level: AchievementLevel;
}

interface AchievementUnlockModalProps {
  lang: Language;
  unlocks: UnlockEntry[];
  onClose: () => void;
}

export function AchievementUnlockModal({ lang, unlocks, onClose }: AchievementUnlockModalProps) {
  const t = i18n[lang];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (unlocks.length > 0) {
      // 延迟显示以实现动画效果
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [unlocks.length]);

  useEffect(() => {
    if (unlocks.length > 1 && currentIndex < unlocks.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, unlocks.length]);

  if (unlocks.length === 0) return null;

  const current = unlocks[currentIndex];
  const config = ACHIEVEMENT_CONFIGS.find(c => c.id === current.id);
  if (!config) return null;

  const renderStars = (level: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          size={24}
          className={i < level ? 'text-[#FFB000]' : 'text-[#333]'}
          fill={i < level ? '#FFB000' : 'transparent'}
          style={{
            animationDelay: `${0.5 + i * 0.15}s`,
          }}
        />
      );
    }
    return stars;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}
    >
      <div
        className="relative bg-[#0a0a0a] border-2 p-6 md:p-10 max-w-md w-full mx-4 text-center"
        style={{
          borderColor: '#FFB000',
          boxShadow: '0 0 40px rgba(255,176,0,0.3), 0 0 80px rgba(255,176,0,0.1)',
          transform: visible ? 'scale(1)' : 'scale(0.8)',
          transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-[#FFB000]/60 hover:text-[#FFB000] transition-colors"
        >
          <X size={20} />
        </button>

        {/* 标题 */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Trophy size={32} className="text-[#FFB000] animate-pulse" />
          <h2 className="text-xl md:text-2xl font-black text-[#FFB000] tracking-widest uppercase">
            {t.ach_new_unlock}
          </h2>
        </div>

        {/* 图标 */}
        <div className="text-6xl mb-4 animate-bounce">
          {config.icon}
        </div>

        {/* 成就名称 */}
        <h3 className="text-lg md:text-xl font-bold text-[#FFB000] mb-2">
          {t[config.nameKey as keyof typeof t]}
        </h3>

        {/* 描述 */}
        <p className="text-sm text-[#00FF41]/60 font-mono mb-4">
          {t[config.descKey as keyof typeof t]}
        </p>

        {/* 星级 */}
        <div className="flex justify-center gap-2 mb-3">
          {renderStars(current.level)}
        </div>

        {/* 等级文字 */}
        <div className="text-[#FFB000] font-mono font-bold text-sm">
          {current.level >= 5
            ? t.ach_level_max
            : `${t.ach_level}${current.level}`}
        </div>

        {/* 进度指示器 */}
        {unlocks.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {unlocks.map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: i === currentIndex ? '#FFB000' : '#333',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}