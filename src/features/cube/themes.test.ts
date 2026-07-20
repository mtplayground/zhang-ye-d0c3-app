import { describe, expect, it, vi } from 'vitest';
import {
  CUBE_THEME_STORAGE_KEY,
  loadCubeThemePreference,
  saveCubeThemePreference,
} from './themePreferences';
import {
  CUBE_THEMES,
  DEFAULT_CUBE_THEME,
  DEFAULT_CUBE_THEME_ID,
  getCubeTheme,
  isCubeThemeId,
} from './themes';

function createStorage(initialValue?: string) {
  const values = new Map<string, string>();

  if (initialValue !== undefined) {
    values.set(CUBE_THEME_STORAGE_KEY, initialValue);
  }

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    values,
  };
}

describe('cube themes', () => {
  it('defines multiple complete color themes', () => {
    expect(CUBE_THEMES.length).toBeGreaterThanOrEqual(2);

    for (const theme of CUBE_THEMES) {
      expect(Object.keys(theme.colors).sort()).toEqual([
        'blue',
        'green',
        'orange',
        'red',
        'white',
        'yellow',
      ]);
    }
  });

  it('resolves known theme ids and falls back to the default theme', () => {
    expect(getCubeTheme('contrast').id).toBe('contrast');
    expect(DEFAULT_CUBE_THEME.id).toBe(DEFAULT_CUBE_THEME_ID);
  });

  it('validates theme ids', () => {
    expect(isCubeThemeId('classic')).toBe(true);
    expect(isCubeThemeId('missing')).toBe(false);
  });

  it('loads stored theme preferences', () => {
    expect(loadCubeThemePreference(createStorage('soft'))).toBe('soft');
    expect(loadCubeThemePreference(createStorage('missing'))).toBe(
      DEFAULT_CUBE_THEME_ID,
    );
  });

  it('saves theme preferences without exposing storage errors', () => {
    const storage = createStorage();

    expect(saveCubeThemePreference('contrast', storage)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      CUBE_THEME_STORAGE_KEY,
      'contrast',
    );
  });
});
