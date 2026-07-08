import React from 'react';
import { Language, i18n } from '../lib/i18n';

interface EndScreenProps {
  score: number;
  onRestart: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  personalBest?: number;
  isNewRecord?: boolean;
  currentUser: any;
}

export function EndScreen({ score, onRestart, lang, setLang, personalBest = 0, isNewRecord = false, currentUser }: EndScreenProps) {
  const t = i18n[lang];

  return (
    <div
      id="end-screen"
      className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#050505]"
      style={{ backgroundImage: 'radial-gradient(#00FF41 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-full h-[2px] bg-[#00FF41]/20"></div>
        <div className="h-full w-[2px] bg-[#00FF41]/20"></div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center p-8 md:p-12 bg-black/80 border border-[#00FF41]/40 shadow-[0_0_20px_rgba(0,255,65,0.2)] w-full max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-widest text-center text-[#FFB000] uppercase">
          {t.end_title}
        </h1>
        
        {isNewRecord && currentUser ? (
          <div className="text-xl md:text-2xl mb-8 font-mono tracking-widest text-[#FFB000] uppercase animate-pulse text-center">
            {lang === 'zh' ? '🎉 恭喜打破你的个人最佳纪录！' : '🎉 NEW PERSONAL BEST!'} <br/>
            <span className="font-bold text-3xl mt-4 block">{score.toString().padStart(6, '0')}</span>
          </div>
        ) : (
          <div className="text-xl md:text-2xl mb-8 font-mono tracking-widest text-[#64FEDA] uppercase text-center">
            {t.end_score} <span className="font-bold">{score.toString().padStart(6, '0')}</span>
            {currentUser && (
              <div className="text-sm mt-4 text-[#00FF41]/60">
                {lang === 'zh' ? '个人最佳' : 'Personal Best'}: {personalBest.toString().padStart(6, '0')}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onRestart}
          className="px-12 py-4 text-xl font-black bg-[#00FF41] text-black uppercase tracking-tighter hover:bg-[#64FEDA] active:scale-[0.98] transition-transform w-full max-w-md mt-8"
        >
          {t.end_btn}
        </button>
      </div>
    </div>
  );
}
