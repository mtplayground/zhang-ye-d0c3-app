import {
  ALL_FACES,
  type Axis,
  type Coordinate,
  type CubeState,
  FACE_SPECS,
  type Move,
  cloneCubeState,
  createSolvedCube,
} from './model';

export const FACE_MOVES: readonly Move[] = ALL_FACES.flatMap((face) => [
  { face, direction: 'clockwise', amount: 1 },
  { face, direction: 'counterclockwise', amount: 1 },
]);

export function applyMove(state: CubeState, move: Move): CubeState {
  const normalizedMove = normalizeMove(move);
  const spec = FACE_SPECS[normalizedMove.face];
  const turns = quarterTurnsForMove(normalizedMove);

  return {
    cubies: state.cubies.map((cubie) => {
      if (cubie.position[spec.axis] !== spec.layer) {
        return {
          ...cubie,
          position: { ...cubie.position },
          stickers: cubie.stickers.map((sticker) => ({
            ...sticker,
            normal: { ...sticker.normal },
          })),
        };
      }

      return {
        ...cubie,
        position: rotateVector(cubie.position, spec.axis, turns),
        stickers: cubie.stickers.map((sticker) => ({
          ...sticker,
          normal: rotateVector(sticker.normal, spec.axis, turns),
        })),
      };
    }),
    moveHistory: [...state.moveHistory, normalizedMove],
  };
}

export function applyMoves(
  state: CubeState,
  moves: readonly Move[],
): CubeState {
  return moves.reduce((nextState, move) => applyMove(nextState, move), state);
}

export function applyMoveSequence(
  state: CubeState,
  sequence: string,
): CubeState {
  return applyMoves(state, parseMoveSequence(sequence));
}

export function invertMove(move: Move): Move {
  if (move.amount === 2) {
    return { ...move };
  }

  return {
    ...move,
    direction:
      move.direction === 'clockwise' ? 'counterclockwise' : 'clockwise',
  };
}

export function invertMoves(moves: readonly Move[]): Move[] {
  return [...moves].reverse().map(invertMove);
}

export function parseMoveSequence(sequence: string): Move[] {
  return sequence.trim().split(/\s+/).filter(Boolean).map(parseMoveToken);
}

export function moveToNotation(move: Move): string {
  const suffix =
    move.amount === 2 ? '2' : move.direction === 'counterclockwise' ? "'" : '';

  return `${move.face}${suffix}`;
}

export function normalizeMove(move: Move): Move {
  return {
    face: move.face,
    direction: move.amount === 2 ? 'clockwise' : move.direction,
    amount: move.amount,
  };
}

export function createScrambleMoves(
  length: number,
  random: () => number = Math.random,
): Move[] {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error('Scramble length must be a non-negative integer');
  }

  const moves: Move[] = [];
  let previousAxis: Axis | undefined;

  while (moves.length < length) {
    const allowedFaces = ALL_FACES.filter(
      (face) => FACE_SPECS[face].axis !== previousAxis,
    );
    const face = allowedFaces[randomIndex(allowedFaces.length, random)];

    const turnRoll = random();
    const move: Move = {
      face,
      direction: turnRoll < 1 / 3 ? 'counterclockwise' : 'clockwise',
      amount: turnRoll > 2 / 3 ? 2 : 1,
    };

    moves.push(normalizeMove(move));
    previousAxis = FACE_SPECS[face].axis;
  }

  return moves;
}

export function createScrambledCube(
  length = 25,
  random: () => number = Math.random,
): CubeState {
  return resetMoveHistory(
    applyMoves(createSolvedCube(), createScrambleMoves(length, random)),
  );
}

export function rotateVector(
  vector: { x: Coordinate; y: Coordinate; z: Coordinate },
  axis: Axis,
  quarterTurns: number,
): { x: Coordinate; y: Coordinate; z: Coordinate } {
  let next = { ...vector };
  const turns = ((quarterTurns % 4) + 4) % 4;

  for (let index = 0; index < turns; index += 1) {
    next = rotatePositiveQuarter(next, axis);
  }

  return next;
}

export function resetMoveHistory(state: CubeState): CubeState {
  return {
    ...cloneCubeState(state),
    moveHistory: [],
  };
}

function parseMoveToken(token: string): Move {
  const face = token[0];

  if (!ALL_FACES.includes(face as (typeof ALL_FACES)[number])) {
    throw new Error(`Invalid move face: ${token}`);
  }

  if (token.length === 1) {
    return { face: face as Move['face'], direction: 'clockwise', amount: 1 };
  }

  if (token.length === 2 && token[1] === "'") {
    return {
      face: face as Move['face'],
      direction: 'counterclockwise',
      amount: 1,
    };
  }

  if (token.length === 2 && token[1] === '2') {
    return { face: face as Move['face'], direction: 'clockwise', amount: 2 };
  }

  throw new Error(`Invalid move token: ${token}`);
}

function quarterTurnsForMove(move: Move): number {
  const spec = FACE_SPECS[move.face];

  if (move.amount === 2) {
    return 2;
  }

  return move.direction === 'clockwise' ? -spec.layer : spec.layer;
}

function rotatePositiveQuarter(
  vector: { x: Coordinate; y: Coordinate; z: Coordinate },
  axis: Axis,
): { x: Coordinate; y: Coordinate; z: Coordinate } {
  if (axis === 'x') {
    return { x: vector.x, y: negative(vector.z), z: vector.y };
  }

  if (axis === 'y') {
    return { x: vector.z, y: vector.y, z: negative(vector.x) };
  }

  return { x: negative(vector.y), y: vector.x, z: vector.z };
}

function negative(value: Coordinate): Coordinate {
  if (value === 0) {
    return 0;
  }

  return value === 1 ? -1 : 1;
}

function randomIndex(length: number, random: () => number): number {
  const value = random();

  if (!Number.isFinite(value)) {
    throw new Error('Random source must return a finite number');
  }

  return Math.max(0, Math.min(length - 1, Math.floor(value * length)));
}
