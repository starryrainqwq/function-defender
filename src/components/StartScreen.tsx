import React, { useState } from 'react';
import { Volume2, Globe, Trophy, LogOut, User, Shield, AlertTriangle, Flame } from 'lucide-react';
import { audio } from '../lib/audio';
import { Language, i18n } from '../lib/i18n';
import { Difficulty, DLCMode, DLCConfig, PressureLevel, ObstacleLevel, DLC_MULTIPLIERS } from '../types';

interface StartScreenProps {
  onStart: (difficulty: Difficulty, dlcConfig: DLCConfig) => void;
  onTutorial: () => void;
  onLeaderboard: () => void;
  onAchievements: () => void;
  onLogout: () => void;
  lang: Language;
  setLang: (lang: Language) => void;
  currentUser: any;
}

export function StartScreen({ onStart, onTutorial, onLeaderboard, onAchievements, onLogout, lang, setLang, currentUser }: StartScreenProps) {
  const [volume, setVolume] = useState(audio.volume);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [activeModes, setActiveModes] = useState<DLCMode[]>([]);
  const [pressureLevel, setPressureLevel] = useState<PressureLevel>(1);
  const [obstacleLevel, setObstacleLevel] = useState<ObstacleLevel>(1);
  const t = i18n[lang];

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    audio.setVolume(v);
  };

  const toggleMode = (mode: DLCMode) => {
    setActiveModes(prev => {
      if (mode === 'none') return [];
      const filtered = prev.filter(m => m !== 'none');
      if (filtered.includes(mode)) {
        return filtered.filter(m => m !== mode);
      } else {
        return [...filtered, mode];
      }
    });
  };

  const isModeActive = (mode: DLCMode) => activeModes.includes(mode);

  const handleStart = () => {
    const dlcConfig: DLCConfig = {
      activeModes: activeModes,
      pressureLevel: isModeActive('pressure') ? pressureLevel : 1,
      obstacleLevel: isModeActive('obstacle') ? obstacleLevel : 1,
    };
    onStart(difficulty, dlcConfig);
  };

  // Calculate combined DLC multiplier for preview
  const dlcMultiplier = activeModes.reduce((product, mode) => {
    const level = mode === 'pressure' ? pressureLevel : mode === 'obstacle' ? obstacleLevel : 1;
    return product * DLC_MULTIPLIERS[mode][level - 1];
  }, 1.0);

  return (
    <div
      id="start-screen"
      className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#050505]"
      style={{ backgroundImage: 'radial-gradient(#00FF41 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center' }}
    >
      {/* Top Left - User Info & Leaderboard */}
      <div className="absolute top-8 left-8 z-20 flex flex-col gap-4">
        <div className="flex items-center gap-2 bg-black/80 p-3 border border-[#00FF41]/40 shadow-[0_0_10px_rgba(0,255,65,0.1)]">
          <User size={18} className="text-[#00FF41]" />
          <span className="text-[#00FF41] font-mono tracking-widest text-sm uppercase">
            {currentUser ? currentUser.email?.split('@')[0] : (lang === 'zh' ? '游客' : 'GUEST')}
          </span>
        </div>
        {currentUser && (
          <button 
            onClick={onLeaderboard}
            className="flex items-center gap-2 bg-black/80 p-3 border border-[#FFB000]/60 hover:bg-[#FFB000]/20 transition-colors shadow-[0_0_10px_rgba(255,176,0,0.1)] group"
          >
            <Trophy size={18} className="text-[#FFB000] group-hover:scale-110 transition-transform" />
            <span className="text-[#FFB000] font-mono tracking-widest text-sm uppercase">
              {lang === 'zh' ? '排行榜' : 'LEADERBOARD'}
            </span>
          </button>
        )}
        <button 
          onClick={onAchievements}
          className="flex items-center gap-2 bg-black/80 p-3 border border-[#00FFFF]/60 hover:bg-[#00FFFF]/20 transition-colors shadow-[0_0_10px_rgba(0,255,255,0.1)] group"
        >
          <Trophy size={18} className="text-[#00FFFF] group-hover:scale-110 transition-transform" />
          <span className="text-[#00FFFF] font-mono tracking-widest text-sm uppercase">
            {lang === 'zh' ? '成就系统' : 'ACHIEVEMENTS'}
          </span>
        </button>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 bg-black/80 p-3 border border-[#FF3D00]/60 hover:bg-[#FF3D00]/20 transition-colors shadow-[0_0_10px_rgba(255,61,0,0.1)] group"
        >
          <LogOut size={18} className="text-[#FF3D00] group-hover:scale-110 transition-transform" />
          <span className="text-[#FF3D00] font-mono tracking-widest text-sm uppercase">
            {lang === 'zh' ? '注销' : 'LOGOUT'}
          </span>
        </button>
      </div>

      <div className="absolute top-8 right-8 z-20 flex flex-col gap-4">
        <div className="flex items-center justify-end gap-2 bg-black/80 p-2 border border-[#00FF41]/40">
          <Globe size={16} className="text-[#00FF41]/60" />
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as Language)}
            className="bg-transparent text-[#00FF41] outline-none text-xs font-mono uppercase cursor-pointer"
          >
            <option value="en" className="bg-black text-[#00FF41]">English</option>
            <option value="zh" className="bg-black text-[#00FF41]">中文</option>
          </select>
        </div>
        <div className="flex items-center gap-2 bg-black/80 p-2 border border-[#00FF41]/40">
          <Volume2 size={16} className="text-[#00FF41]/60" />
          <input 
            type="range" 
            min="0" max="1" step="0.01" 
            value={volume} 
            onChange={handleVolumeChange} 
            className="w-24 accent-[#00FF41]"
          />
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-full h-[2px] bg-[#00FF41]/20"></div>
        <div className="h-full w-[2px] bg-[#00FF41]/20"></div>
      </div>
      
      <div className="relative z-10 flex flex-col items-center p-6 md:p-10 bg-black/80 border border-[#00FF41]/40 shadow-[0_0_20px_rgba(0,255,65,0.2)] max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="w-4 h-4 bg-[#00FF41] rounded-full shadow-[0_0_15px_#00FF41] mb-4 animate-pulse"></div>
        <h1 className="text-3xl md:text-5xl font-black mb-3 tracking-widest text-center text-[#00FF41] uppercase">
          {t.start_title1}
        </h1>
        <h2 className="text-xl md:text-2xl font-bold mb-6 tracking-widest text-center text-[#64FEDA] uppercase">
          {t.start_title2}
        </h2>
        
        {/* Difficulty Selection */}
        <h3 className="text-center text-xs text-[#00FF41]/60 uppercase tracking-widest mb-3">{t.diff_title}</h3>
        <div className="flex flex-col md:flex-row gap-3 w-full justify-center mb-6">
          <button 
            onClick={() => setDifficulty('easy')} 
            className={`flex-1 px-3 py-3 border transition-colors active:scale-[0.98] ${
              difficulty === 'easy'
                ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]'
                : 'bg-black border-[#00FF41]/40 text-[#00FF41]/60 hover:border-[#00FF41]'
            }`}
          >
            <div className="font-bold text-lg">{t.diff_easy}</div>
            <div className="text-[10px] font-mono opacity-80 mt-1 uppercase tracking-widest">{t.diff_easy_desc}</div>
          </button>
          
          <button 
            onClick={() => setDifficulty('medium')} 
            className={`flex-1 px-3 py-3 border transition-colors active:scale-[0.98] ${
              difficulty === 'medium'
                ? 'bg-[#FFB000]/20 border-[#FFB000] text-[#FFB000]'
                : 'bg-black border-[#FFB000]/40 text-[#FFB000]/60 hover:border-[#FFB000]'
            }`}
          >
            <div className="font-bold text-lg">{t.diff_medium}</div>
            <div className="text-[10px] font-mono opacity-80 mt-1 uppercase tracking-widest">{t.diff_medium_desc}</div>
          </button>
          
          <button 
            onClick={() => setDifficulty('hard')} 
            className={`flex-1 px-3 py-3 border transition-colors active:scale-[0.98] ${
              difficulty === 'hard'
                ? 'bg-[#FF3D00]/20 border-[#FF3D00] text-[#FF3D00]'
                : 'bg-black border-[#FF3D00]/40 text-[#FF3D00]/60 hover:border-[#FF3D00]'
            }`}
          >
            <div className="font-bold text-lg">{t.diff_hard}</div>
            <div className="text-[10px] font-mono opacity-80 mt-1 uppercase tracking-widest">{t.diff_hard_desc}</div>
          </button>
        </div>

        {/* DLC Mode Selection - Multi-select */}
        <h3 className="text-center text-xs text-[#FFB000] uppercase tracking-widest mb-3">
          {t.dlc_title} {lang === 'zh' ? '(可多选)' : '(MULTI-SELECT)'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mb-6">
          {/* Standard */}
          <button
            onClick={() => toggleMode('none')}
            className={`p-3 border transition-all text-left ${
              activeModes.length === 0
                ? 'bg-[#00FF41]/10 border-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.15)]'
                : 'bg-black border-[#00FF41]/30 hover:border-[#00FF41]/60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-[#00FF41]" />
              <span className="font-bold text-sm text-[#00FF41] uppercase">{t.dlc_none}</span>
              <span className="ml-auto text-[10px] font-mono text-[#00FF41]/40">
                {activeModes.length === 0 ? '✓' : ''}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#00FF41]/60">{t.dlc_none_desc}</div>
          </button>

          {/* Pressure Mode */}
          <button
            onClick={() => toggleMode('pressure')}
            className={`p-3 border transition-all text-left ${
              isModeActive('pressure')
                ? 'bg-[#FF3D00]/10 border-[#FF3D00] shadow-[0_0_10px_rgba(255,61,0,0.15)]'
                : 'bg-black border-[#FF3D00]/30 hover:border-[#FF3D00]/60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="text-[#FF3D00]" />
              <span className="font-bold text-sm text-[#FF3D00] uppercase">{t.dlc_pressure}</span>
              <span className="ml-auto text-[10px] font-mono text-[#FF3D00]">
                {isModeActive('pressure') ? '✓' : ''}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#FF3D00]/60 mb-2">{t.dlc_pressure_desc}</div>
            {isModeActive('pressure') && (
              <>
                <div className="flex gap-1">
                  {([1, 2, 3] as PressureLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={(e) => { e.stopPropagation(); setPressureLevel(lvl); }}
                      className={`flex-1 py-1 text-[10px] font-mono border transition-colors ${
                        pressureLevel === lvl
                          ? 'bg-[#FF3D00]/30 border-[#FF3D00] text-[#FF3D00]'
                          : 'bg-black border-[#FF3D00]/30 text-[#FF3D00]/50 hover:border-[#FF3D00]/60'
                      }`}
                    >
                      {t.dlc_level} {lvl}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-[#FF3D00]/80 mt-1">
                  {pressureLevel === 1 && t.dlc_pressure_l1}
                  {pressureLevel === 2 && t.dlc_pressure_l2}
                  {pressureLevel === 3 && t.dlc_pressure_l3}
                </div>
              </>
            )}
          </button>

          {/* Obstacle Mode */}
          <button
            onClick={() => toggleMode('obstacle')}
            className={`p-3 border transition-all text-left ${
              isModeActive('obstacle')
                ? 'bg-[#FFB000]/10 border-[#FFB000] shadow-[0_0_10px_rgba(255,176,0,0.15)]'
                : 'bg-black border-[#FFB000]/30 hover:border-[#FFB000]/60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-[#FFB000]" />
              <span className="font-bold text-sm text-[#FFB000] uppercase">{t.dlc_obstacle}</span>
              <span className="ml-auto text-[10px] font-mono text-[#FFB000]">
                {isModeActive('obstacle') ? '✓' : ''}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#FFB000]/60 mb-2">{t.dlc_obstacle_desc}</div>
            {isModeActive('obstacle') && (
              <>
                <div className="flex gap-1">
                  {([1, 2, 3] as ObstacleLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={(e) => { e.stopPropagation(); setObstacleLevel(lvl); }}
                      className={`flex-1 py-1 text-[10px] font-mono border transition-colors ${
                        obstacleLevel === lvl
                          ? 'bg-[#FFB000]/30 border-[#FFB000] text-[#FFB000]'
                          : 'bg-black border-[#FFB000]/30 text-[#FFB000]/50 hover:border-[#FFB000]/60'
                      }`}
                    >
                      {t.dlc_level} {lvl}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-[#FFB000]/80 mt-1">
                  {obstacleLevel === 1 && t.dlc_obstacle_l1}
                  {obstacleLevel === 2 && t.dlc_obstacle_l2}
                  {obstacleLevel === 3 && t.dlc_obstacle_l3}
                </div>
              </>
            )}
          </button>

          {/* Fervor Mode */}
          <button
            onClick={() => toggleMode('fervor')}
            className={`p-3 border transition-all text-left ${
              isModeActive('fervor')
                ? 'bg-[#00FFFF]/10 border-[#00FFFF] shadow-[0_0_10px_rgba(0,255,255,0.15)]'
                : 'bg-black border-[#00FFFF]/30 hover:border-[#00FFFF]/60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className="text-[#00FFFF]" />
              <span className="font-bold text-sm text-[#00FFFF] uppercase">{t.dlc_fervor}</span>
              <span className="ml-auto text-[10px] font-mono text-[#00FFFF]">
                {isModeActive('fervor') ? '✓' : ''}
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#00FFFF]/60">{t.dlc_fervor_desc}</div>
          </button>
        </div>

        {/* DLC Multiplier Preview */}
        {activeModes.length > 0 && (
          <div className="w-full mb-6 p-3 bg-[#FFB000]/10 border border-[#FFB000]/30 text-center">
            <span className="text-[10px] font-mono text-[#FFB000]/60 uppercase tracking-widest">
              {lang === 'zh' ? '综合倍率' : 'COMBINED MULTIPLIER'}
            </span>
            <div className="text-2xl font-black text-[#FFB000] font-mono mt-1">
              x{dlcMultiplier.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-[#FFB000]/40 mt-1">
              {activeModes.map(mode => {
                const level = mode === 'pressure' ? pressureLevel : mode === 'obstacle' ? obstacleLevel : 1;
                const mult = DLC_MULTIPLIERS[mode][level - 1];
                return `${mode.toUpperCase()} x${mult.toFixed(1)}`;
              }).join(' × ')}
            </div>
          </div>
        )}

        <div className="flex gap-3 w-full">
          <button 
            onClick={onTutorial} 
            className="flex-1 px-4 py-3 bg-black border border-[#00FF41]/40 text-[#00FF41]/60 hover:border-[#00FF41] hover:text-[#00FF41] transition-colors active:scale-[0.98]"
          >
            <div className="font-bold text-sm">{lang === 'zh' ? '新手教学' : 'TUTORIAL'}</div>
          </button>
          <button 
            onClick={handleStart} 
            className="flex-1 px-4 py-3 bg-[#00FF41] text-black hover:bg-[#33FF66] transition-colors active:scale-[0.98] font-bold text-sm uppercase tracking-widest"
          >
            {t.dlc_confirm}
          </button>
        </div>
      </div>
    </div>
  );
}