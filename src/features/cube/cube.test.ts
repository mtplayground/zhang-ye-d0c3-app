import { describe, expect, it } from 'vitest';
import {
  ALL_FACES,
  FACE_COLORS,
  FACE_SPECS,
  type CubeState,
  type Face,
  type Move,
  createSolvedCube,
  getFaceStickers,
  getStickerCount,
  isSolved,
} from './model';
import {
  applyMove,
  applyMoves,
  createScrambledCube,
  createScrambleMoves,
  invertMoves,
  moveToNotation,
  parseMoveSequence,
  resetMoveHistory,
} from './moves';

const faceMove = (
  face: Face,
  direction: Move['direction'] = 'clockwise',
  amount: Move['amount'] = 1,
): Move => ({ face, direction, amount });

describe('cube state model', () => {
  it('creates a solved 3x3 cube with 26 cubies and 54 stickers', () => {
    const cube = createSolvedCube();

    expect(cube.cubies).toHaveLength(26);
    expect(getStickerCount(cube)).toBe(54);
    expect(isSolved(cube)).toBe(true);

    for (const face of ALL_FACES) {
      expect(getFaceStickers(cube, face)).toEqual(
        Array.from({ length: 9 }, () => FACE_COLORS[face]),
      );
    }
  });

  it('clones state through moves without mutating the original cube', () => {
    const solved = createSolvedCube();
    const moved = applyMove(solved, faceMove('R'));

    expect(isSolved(solved)).toBe(true);
    expect(isSolved(moved)).toBe(false);
    expect(solved.moveHistory).toHaveLength(0);
    expect(moved.moveHistory.map(moveToNotation)).toEqual(['R']);
  });
});

describe('turn engine', () => {
  it.each(ALL_FACES)(
    '%s clockwise move returns to solved after four turns',
    (face) => {
      const state = applyMoves(createSolvedCube(), [
        faceMove(face),
        faceMove(face),
        faceMove(face),
        faceMove(face),
      ]);

      expect(isSolved(state)).toBe(true);
      expectPreservedCubeShape(state);
    },
  );

  it.each(ALL_FACES)('%s inverse move cancels a clockwise move', (face) => {
    const state = applyMoves(createSolvedCube(), [
      faceMove(face),
      faceMove(face, 'counterclockwise'),
    ]);

    expect(isSolved(state)).toBe(true);
    expectPreservedCubeShape(state);
  });

  it.each(ALL_FACES)('%s double turn is its own inverse', (face) => {
    const state = applyMoves(createSolvedCube(), [
      faceMove(face, 'clockwise', 2),
      faceMove(face, 'clockwise', 2),
    ]);

    expect(isSolved(state)).toBe(true);
    expectPreservedCubeShape(state);
  });

  it('applies parsed notation and reverses a sequence with inverse moves', () => {
    const sequence = parseMoveSequence("R U R' U' F2 L D'");
    const scrambled = applyMoves(createSolvedCube(), sequence);
    const restored = applyMoves(scrambled, invertMoves(sequence));

    expect(sequence.map(moveToNotation)).toEqual([
      'R',
      'U',
      "R'",
      "U'",
      'F2',
      'L',
      "D'",
    ]);
    expect(isSolved(scrambled)).toBe(false);
    expect(isSolved(restored)).toBe(true);
    expect(restored.moveHistory.map(moveToNotation)).toEqual([
      'R',
      'U',
      "R'",
      "U'",
      'F2',
      'L',
      "D'",
      'D',
      "L'",
      'F2',
      'U',
      'R',
      "U'",
      "R'",
    ]);
  });

  it('can reset move history without changing the cube arrangement', () => {
    const moved = applyMoves(createSolvedCube(), parseMoveSequence('R U F'));
    const reset = resetMoveHistory(moved);

    expect(reset.moveHistory).toHaveLength(0);
    expect(reset.cubies).toEqual(moved.cubies);
  });

  it('creates scramble sequences that avoid repeating the same axis back to back', () => {
    const values = [
      0.01, 0.9, 0.2, 0.7, 0.4, 0.1, 0.8, 0.2, 0.5, 0.95, 0.0, 0.2,
    ];
    let index = 0;
    const moves = createScrambleMoves(4, () => values[index++ % values.length]);

    expect(moves).toHaveLength(4);
    expect(moves.map(moveToNotation)).toEqual(['U2', 'L2', "D'", "B'"]);

    for (let moveIndex = 1; moveIndex < moves.length; moveIndex += 1) {
      expect(FACE_SPECS[moves[moveIndex].face].axis).not.toBe(
        FACE_SPECS[moves[moveIndex - 1].face].axis,
      );
    }
  });

  it('creates a scrambled cube with reset move history', () => {
    const values = [
      0.01, 0.9, 0.2, 0.7, 0.4, 0.1, 0.8, 0.2, 0.5, 0.95, 0.0, 0.2, 0.3, 0.4,
    ];
    let index = 0;
    const cube = createScrambledCube(6, () => values[index++ % values.length]);

    expect(cube.cubies).toHaveLength(26);
    expect(getStickerCount(cube)).toBe(54);
    expect(cube.moveHistory).toHaveLength(0);
    expect(isSolved(cube)).toBe(false);
  });
});

function expectPreservedCubeShape(state: CubeState) {
  expect(state.cubies).toHaveLength(26);
  expect(getStickerCount(state)).toBe(54);

  const positions = new Set(
    state.cubies.map((cubie) => cubiePositionKey(cubie.position)),
  );
  const ids = new Set(state.cubies.map((cubie) => cubie.id));

  expect(positions.size).toBe(26);
  expect(ids.size).toBe(26);
}

function cubiePositionKey(position: { x: number; y: number; z: number }) {
  return `${position.x},${position.y},${position.z}`;
}
