import { FACE_COLORS, type ColorKey, type CubeState, type Vec3 } from './model';

export type RenderSticker = {
  color: ColorKey;
  normal: Vec3;
};

export type RenderCubie = {
  id: string;
  position: Vec3;
  stickers: RenderSticker[];
};

export const CLASSIC_CUBE_HEX: Record<ColorKey, string> = {
  white: '#f8fafc',
  yellow: '#ffd500',
  red: '#c1121f',
  orange: '#f77f00',
  blue: '#0057b8',
  green: '#009b48',
};

export const FACE_COLOR_HEX = Object.fromEntries(
  Object.entries(FACE_COLORS).map(([face, color]) => [
    face,
    CLASSIC_CUBE_HEX[color],
  ]),
) as Record<keyof typeof FACE_COLORS, string>;

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
