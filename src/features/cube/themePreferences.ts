import {
  DEFAULT_CUBE_THEME_ID,
  isCubeThemeId,
  type CubeThemeId,
} from './themes';

export const CUBE_THEME_STORAGE_KEY = 'classic-cube.theme.v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadCubeThemePreference(
  storage: StorageLike = window.localStorage,
): CubeThemeId {
  try {
    const storedThemeId = storage.getItem(CUBE_THEME_STORAGE_KEY);

    return isCubeThemeId(storedThemeId) ? storedThemeId : DEFAULT_CUBE_THEME_ID;
  } catch (error) {
    console.warn(
      'Failed to load cube theme preference from localStorage',
      error,
    );
    return DEFAULT_CUBE_THEME_ID;
  }
}

export function saveCubeThemePreference(
  themeId: CubeThemeId,
  storage: StorageLike = window.localStorage,
): boolean {
  try {
    storage.setItem(CUBE_THEME_STORAGE_KEY, themeId);
    return true;
  } catch (error) {
    console.warn('Failed to save cube theme preference to localStorage', error);
    return false;
  }
}
