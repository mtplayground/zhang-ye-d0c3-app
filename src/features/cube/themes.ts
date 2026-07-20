import type { ColorKey } from './model';

export type CubeThemeId = 'classic' | 'contrast' | 'soft';

export type CubeTheme = {
  id: CubeThemeId;
  name: string;
  description: string;
  colors: Record<ColorKey, string>;
};

export const CUBE_THEMES: readonly CubeTheme[] = [
  {
    id: 'classic',
    name: '经典六色',
    description: '标准白黄红橙蓝绿配色',
    colors: {
      white: '#f8fafc',
      yellow: '#ffd500',
      red: '#c1121f',
      orange: '#f77f00',
      blue: '#0057b8',
      green: '#009b48',
    },
  },
  {
    id: 'contrast',
    name: '高对比',
    description: '更深色块，便于强光环境识别',
    colors: {
      white: '#ffffff',
      yellow: '#ffe100',
      red: '#e11d48',
      orange: '#fb923c',
      blue: '#2563eb',
      green: '#16a34a',
    },
  },
  {
    id: 'soft',
    name: '柔和',
    description: '降低饱和度，长时间练习更舒适',
    colors: {
      white: '#f8fafc',
      yellow: '#fde68a',
      red: '#f87171',
      orange: '#fdba74',
      blue: '#60a5fa',
      green: '#6ee7b7',
    },
  },
];

export const DEFAULT_CUBE_THEME_ID: CubeThemeId = 'classic';

export const DEFAULT_CUBE_THEME = getCubeTheme(DEFAULT_CUBE_THEME_ID);

export function getCubeTheme(themeId: CubeThemeId): CubeTheme {
  return CUBE_THEMES.find((theme) => theme.id === themeId) ?? CUBE_THEMES[0];
}

export function isCubeThemeId(value: unknown): value is CubeThemeId {
  return CUBE_THEMES.some((theme) => theme.id === value);
}
