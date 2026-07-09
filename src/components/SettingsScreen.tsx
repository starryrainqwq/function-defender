import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Language, i18n } from '../lib/i18n';
import { FunctionType, UserPreferences } from '../types';
import { loadPreferences, savePreferences, DEFAULT_LOADOUT } from '../lib/preferences';
import { ALL_FUNCTIONS } from '../lib/functionLabels';

interface SettingsScreenProps {
  lang: Language;
  onBack: () => void;
}

export function SettingsScreen({ lang, onBack }: SettingsScreenProps) {
  const t = i18n[lang];
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences());
  const [error, setError] = useState<string | null>(null);

  const selected = prefs.loadout;

  const toggleFunction = (value: FunctionType) => {
    setError(null);
    setPrefs((prev) => {
      const exists = prev.loadout.includes(value);
      if (exists) {
        return { ...prev, loadout: prev.loadout.filter((f) => f !== value) };
      }
      if (prev.loadout.length >= 4) {
        setError(
          lang === 'zh'
            ? '最多选择 4 个，请先取消一个'
            : 'Maximum 4 functions. Please uncheck one first.'
        );
        return prev;
      }
      return { ...prev, loadout: [...prev.loadout, value] };
    });
  };

  const handleSave = () => {
    if (selected.length !== 4) {
      const remaining = 4 - selected.length;
      setError(
        remaining > 0
          ? lang === 'zh'
            ? `还需选择 ${remaining} 个函数`
            : `Select ${remaining} more function${remaining > 1 ? 's' : ''}`
          : lang === 'zh'
            ? '最多选择 4 个，请先取消一个'
            : 'Maximum 4 functions. Please deselect one first.'
      );
      return;
    }

    savePreferences(prefs);
    onBack();
  };

  const resetToDefault = () => {
    setError(null);
    setPrefs((prev) => ({ ...prev, loadout: DEFAULT_LOADOUT }));
  };

  const setFloating = (patch: Partial<UserPreferences['floatingButton']>) => {
    setPrefs((prev) => ({
      ...prev,
      floatingButton: { ...prev.floatingButton, ...patch },
    }));
  };

  const positionOptions: { value: UserPreferences['floatingButton']['position']; label: string }[] = [
    { value: 'top-left', label: lang === 'zh' ? '左上' : 'Top Left' },
    { value: 'top-right', label: lang === 'zh' ? '右上' : 'Top Right' },
    { value: 'bottom-left', label: lang === 'zh' ? '左下' : 'Bottom Left' },
    { value: 'bottom-right', label: lang === 'zh' ? '右下' : 'Bottom Right' },
  ];

  const themeOptions: { value: UserPreferences['floatingButton']['theme']; label: string }[] = [
    { value: 'amber', label: lang === 'zh' ? '琥珀' : 'Amber' },
    { value: 'green', label: lang === 'zh' ? '绿色' : 'Green' },
    { value: 'cyan', label: lang === 'zh' ? '青色' : 'Cyan' },
  ];

  const sizeOptions: { value: UserPreferences['floatingButton']['size']; label: string }[] = [
    { value: 'sm', label: lang === 'zh' ? '小' : 'Small' },
    { value: 'md', label: lang === 'zh' ? '中' : 'Medium' },
    { value: 'lg', label: lang === 'zh' ? '大' : 'Large' },
  ];

  return (
    <div
      id="settings-screen"
      className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#050505]"
      style={{ backgroundImage: 'radial-gradient(#00FF41 1px, transparent 1px)', backgroundSize: '40px 40px', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="w-full h-[2px] bg-[#00FF41]/20"></div>
        <div className="h-full w-[2px] bg-[#00FF41]/20"></div>
      </div>

      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/80 p-3 border border-[#00FF41]/40 hover:bg-[#00FF41]/20 transition-colors"
      >
        <ArrowLeft size={18} className="text-[#00FF41]" />
        <span className="text-[#00FF41] font-mono text-sm uppercase">{lang === 'zh' ? '返回' : 'BACK'}</span>
      </button>

      <div className="relative z-10 flex flex-col p-6 md:p-8 bg-black/80 border border-[#00FF41]/40 shadow-[0_0_20px_rgba(0,255,65,0.2)] max-w-2xl w-full mx-4 max-h-[92vh] overflow-y-auto">
        <h1 className="text-2xl md:text-3xl font-black mb-6 tracking-widest text-center text-[#00FF41] uppercase">
          {lang === 'zh' ? '设置' : 'SETTINGS'}
        </h1>

        {/* Function Loadout */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase text-[#00FF41]/80 tracking-widest">
              {lang === 'zh' ? '出战函数 (4个)' : 'FUNCTION LOADOUT (4)'}
            </h2>
            <span className="text-xs font-mono text-[#00FF41]/60">
              {selected.length}/4
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ALL_FUNCTIONS.map((item) => {
              const isSelected = selected.includes(item.value);
              const atMax = selected.length >= 4 && !isSelected;
              return (
                <button
                  key={item.value}
                  onClick={() => toggleFunction(item.value)}
                  className={`p-3 border text-left text-xs font-mono transition-colors active:scale-[0.98] ${
                    isSelected
                      ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]'
                      : atMax
                        ? 'bg-black border-[#00FF41]/20 text-[#00FF41]/30 cursor-not-allowed'
                        : 'bg-black border-[#00FF41]/30 text-[#00FF41]/60 hover:border-[#00FF41]/60 hover:text-[#00FF41]'
                  }`}
                  disabled={atMax}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span>{t[item.labelKey]}</span>
                    <span className="text-[10px]">{isSelected ? '✓' : ''}</span>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={resetToDefault}
            className="mt-3 text-[10px] font-mono text-[#00FF41]/60 hover:text-[#00FF41] underline"
          >
            {lang === 'zh' ? '恢复默认' : 'Reset to Default'}
          </button>
          {error && (
            <div className="mt-3 text-red-500 text-xs font-mono text-center animate-pulse">
              {error}
            </div>
          )}
        </section>

        {/* Floating Button Settings */}
        <section className="mb-6 border-t border-[#00FF41]/20 pt-6">
          <h2 className="text-xs uppercase text-[#00FF41]/80 tracking-widest mb-3">
            {lang === 'zh' ? '悬浮连发按钮' : 'Floating Fire Button'}
          </h2>

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-[#00FF41]/70">
              {lang === 'zh' ? '显示悬浮按钮' : 'Show Floating Button'}
            </span>
            <button
              onClick={() => setFloating({ enabled: !prefs.floatingButton.enabled })}
              className={`w-12 h-6 border transition-colors relative ${
                prefs.floatingButton.enabled
                  ? 'bg-[#00FF41]/30 border-[#00FF41]'
                  : 'bg-black border-[#00FF41]/30'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 bg-[#00FF41] transition-all ${
                  prefs.floatingButton.enabled ? 'left-6' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <div className="mb-4">
            <span className="text-xs font-mono text-[#00FF41]/70 block mb-2">
              {lang === 'zh' ? '位置' : 'Position'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {positionOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFloating({ position: opt.value })}
                  className={`p-2 border text-xs font-mono transition-colors ${
                    prefs.floatingButton.position === opt.value
                      ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]'
                      : 'bg-black border-[#00FF41]/30 text-[#00FF41]/60 hover:border-[#00FF41]/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <span className="text-xs font-mono text-[#00FF41]/70 block mb-2">
              {lang === 'zh' ? '主题色' : 'Theme'}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFloating({ theme: opt.value })}
                  className={`p-2 border text-xs font-mono transition-colors ${
                    prefs.floatingButton.theme === opt.value
                      ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]'
                      : 'bg-black border-[#00FF41]/30 text-[#00FF41]/60 hover:border-[#00FF41]/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-mono text-[#00FF41]/70 block mb-2">
              {lang === 'zh' ? '大小' : 'Size'}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {sizeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFloating({ size: opt.value })}
                  className={`p-2 border text-xs font-mono transition-colors ${
                    prefs.floatingButton.size === opt.value
                      ? 'bg-[#00FF41]/20 border-[#00FF41] text-[#00FF41]'
                      : 'bg-black border-[#00FF41]/30 text-[#00FF41]/60 hover:border-[#00FF41]/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          className="w-full px-4 py-3 bg-[#00FF41] text-black hover:bg-[#33FF66] transition-colors active:scale-[0.98] font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {lang === 'zh' ? '保存设置' : 'SAVE SETTINGS'}
        </button>
      </div>
    </div>
  );
}