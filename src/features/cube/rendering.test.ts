import { describe, expect, it } from 'vitest';
import { applyMove, createSolvedCube } from '.';
import { ALL_FACES, FACE_COLORS } from './model';
import {
  CLASSIC_CUBE_HEX,
  FACE_COLOR_HEX,
  getFaceColorHex,
  getRenderCubies,
} from './rendering';
import { getCubeTheme } from './themes';

describe('cube rendering projection', () => {
  it('projects the solved cube into renderable cubies and stickers', () => {
    const cubies = getRenderCubies(createSolvedCube());

    expect(cubies).toHaveLength(26);
    expect(
      cubies.reduce((count, cubie) => count + cubie.stickers.length, 0),
    ).toBe(54);
    expect(new Set(cubies.map((cubie) => cubie.id)).size).toBe(26);
  });

  it('exposes classic six-color materials for every face color', () => {
    for (const face of ALL_FACES) {
      expect(FACE_COLOR_HEX[face]).toBe(CLASSIC_CUBE_HEX[FACE_COLORS[face]]);
    }
  });

  it('maps face colors through alternate themes', () => {
    const faceColors = getFaceColorHex(getCubeTheme('soft'));

    expect(faceColors.U).toBe('#f8fafc');
    expect(faceColors.D).toBe('#fde68a');
    expect(faceColors.R).toBe('#f87171');
  });

  it('updates render projection after a state move', () => {
    const solved = getRenderCubies(createSolvedCube());
    const moved = getRenderCubies(
      applyMove(createSolvedCube(), {
        face: 'R',
        direction: 'clockwise',
        amount: 1,
      }),
    );

    expect(moved).not.toEqual(solved);
    expect(moved).toHaveLength(26);
  });
});
