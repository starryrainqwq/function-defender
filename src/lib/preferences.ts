import { UserPreferences, FunctionLoadout, FunctionType } from '../types';

const STORAGE_KEY = 'function-defender-preferences-v1';

export const DEFAULT_LOADOUT: FunctionLoadout = [
  'linear',
  'quadratic',
  'rational',
  'trigonometric',
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  floatingButton: {
    enabled: true,
    position: 'top-left',
    theme: 'amber',
    size: 'md',
  },
  loadout: DEFAULT_LOADOUT,
};

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return normalizePreferences(parsed);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function normalizePreferences(partial: Partial<UserPreferences>): UserPreferences {
  const allFunctions: FunctionType[] = [
    'linear',
    'quadratic',
    'rational',
    'power',
    'trigonometric',
    'tangent',
    'constant_x',
    'constant_y',
  ];

  const loadout = (partial.loadout ?? DEFAULT_LOADOUT).filter((f): f is FunctionType =>
    allFunctions.includes(f as FunctionType)
  );

  const validLoadout = loadout.length >= 4 ? loadout.slice(0, 4) : DEFAULT_LOADOUT.slice(0, 4);

  const validPosition: UserPreferences['floatingButton']['position'] =
    partial.floatingButton?.position && ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(partial.floatingButton.position)
      ? partial.floatingButton.position
      : DEFAULT_PREFERENCES.floatingButton.position;

  const validTheme: UserPreferences['floatingButton']['theme'] =
    partial.floatingButton?.theme && ['amber', 'green', 'cyan'].includes(partial.floatingButton.theme)
      ? partial.floatingButton.theme
      : DEFAULT_PREFERENCES.floatingButton.theme;

  const validSize: UserPreferences['floatingButton']['size'] =
    partial.floatingButton?.size && ['sm', 'md', 'lg'].includes(partial.floatingButton.size)
      ? partial.floatingButton.size
      : DEFAULT_PREFERENCES.floatingButton.size;

  return {
    floatingButton: {
      enabled: partial.floatingButton?.enabled ?? DEFAULT_PREFERENCES.floatingButton.enabled,
      position: validPosition,
      theme: validTheme,
      size: validSize,
    },
    loadout: validLoadout,
  };
}