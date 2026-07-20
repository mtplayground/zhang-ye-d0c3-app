import { FACE_COLORS, type ColorKey, type CubeState, type Vec3 } from './model';
import { DEFAULT_CUBE_THEME, type CubeTheme } from './themes';

export type RenderSticker = {
  color: ColorKey;
  normal: Vec3;
};

export type RenderCubie = {
  id: string;
  position: Vec3;
  stickers: RenderSticker[];
};

export const CLASSIC_CUBE_HEX: Record<ColorKey, string> =
  DEFAULT_CUBE_THEME.colors;

export const FACE_COLOR_HEX = getFaceColorHex(DEFAULT_CUBE_THEME);

export function getFaceColorHex(theme: CubeTheme) {
  return Object.fromEntries(
    Object.entries(FACE_COLORS).map(([face, color]) => [
      face,
      theme.colors[color],
    ]),
  ) as Record<keyof typeof FACE_COLORS, string>;
}

export function getRenderCubies(state: CubeState): RenderCubie[] {
  return state.cubies.map((cubie) => ({
    id: cubie.id,
    position: { ...cubie.position },
    stickers: cubie.stickers.map((sticker) => ({
      color: sticker.color,
      normal: { ...sticker.normal },
    })),
  }));
}
