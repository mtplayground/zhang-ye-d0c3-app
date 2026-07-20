export type Face = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';
export type Axis = 'x' | 'y' | 'z';
export type Layer = -1 | 0 | 1;
export type Coordinate = -1 | 0 | 1;
export type TurnDirection = 'clockwise' | 'counterclockwise';
export type TurnAmount = 1 | 2;
export type ColorKey = 'white' | 'yellow' | 'blue' | 'green' | 'red' | 'orange';

export type Vec3 = {
  x: Coordinate;
  y: Coordinate;
  z: Coordinate;
};

export type Sticker = {
  normal: Vec3;
  color: ColorKey;
  homeFace: Face;
};

export type Cubie = {
  id: string;
  homePosition: Vec3;
  position: Vec3;
  stickers: Sticker[];
};

export type CubeState = {
  cubies: Cubie[];
  moveHistory: Move[];
};

export type Move = {
  face: Face;
  direction: TurnDirection;
  amount: TurnAmount;
};

export type FaceSpec = {
  axis: Axis;
  layer: Exclude<Layer, 0>;
  normal: Vec3;
};

export const ALL_FACES: readonly Face[] = ['U', 'D', 'L', 'R', 'F', 'B'];

export const FACE_COLORS: Record<Face, ColorKey> = {
  U: 'white',
  D: 'yellow',
  L: 'orange',
  R: 'red',
  F: 'green',
  B: 'blue',
};

export const FACE_SPECS: Record<Face, FaceSpec> = {
  U: { axis: 'y', layer: 1, normal: { x: 0, y: 1, z: 0 } },
  D: { axis: 'y', layer: -1, normal: { x: 0, y: -1, z: 0 } },
  L: { axis: 'x', layer: -1, normal: { x: -1, y: 0, z: 0 } },
  R: { axis: 'x', layer: 1, normal: { x: 1, y: 0, z: 0 } },
  F: { axis: 'z', layer: 1, normal: { x: 0, y: 0, z: 1 } },
  B: { axis: 'z', layer: -1, normal: { x: 0, y: 0, z: -1 } },
};

const COORDINATES: readonly Coordinate[] = [-1, 0, 1];
const DIRECTIONS: readonly Vec3[] = [
  FACE_SPECS.U.normal,
  FACE_SPECS.D.normal,
  FACE_SPECS.L.normal,
  FACE_SPECS.R.normal,
  FACE_SPECS.F.normal,
  FACE_SPECS.B.normal,
];

export function createSolvedCube(): CubeState {
  const cubies: Cubie[] = [];

  for (const x of COORDINATES) {
    for (const y of COORDINATES) {
      for (const z of COORDINATES) {
        if (x === 0 && y === 0 && z === 0) {
          continue;
        }

        const position = { x, y, z };
        const stickers = DIRECTIONS.filter((normal) =>
          isOuterSticker(position, normal),
        ).map((normal) => {
          const homeFace = faceFromNormal(normal);

          return {
            normal: { ...normal },
            color: FACE_COLORS[homeFace],
            homeFace,
          };
        });

        cubies.push({
          id: cubieId(position),
          homePosition: { ...position },
          position,
          stickers,
        });
      }
    }
  }

  return {
    cubies,
    moveHistory: [],
  };
}

export function cloneCubeState(state: CubeState): CubeState {
  return {
    cubies: state.cubies.map((cubie) => ({
      id: cubie.id,
      homePosition: { ...cubie.homePosition },
      position: { ...cubie.position },
      stickers: cubie.stickers.map((sticker) => ({
        normal: { ...sticker.normal },
        color: sticker.color,
        homeFace: sticker.homeFace,
      })),
    })),
    moveHistory: state.moveHistory.map((move) => ({ ...move })),
  };
}

export function isSolved(state: CubeState): boolean {
  return ALL_FACES.every((face) =>
    getFaceStickers(state, face).every((color) => color === FACE_COLORS[face]),
  );
}

export function getFaceStickers(state: CubeState, face: Face): ColorKey[] {
  return facePositions(face).map((position) => {
    const cubie = state.cubies.find((candidate) =>
      samePosition(candidate.position, position),
    );

    if (!cubie) {
      throw new Error(`Missing cubie at ${cubieId(position)} for face ${face}`);
    }

    const sticker = cubie.stickers.find((candidate) =>
      samePosition(candidate.normal, FACE_SPECS[face].normal),
    );

    if (!sticker) {
      throw new Error(
        `Missing sticker with normal ${cubieId(FACE_SPECS[face].normal)} on cubie ${cubie.id}`,
      );
    }

    return sticker.color;
  });
}

export function getStickerCount(state: CubeState): number {
  return state.cubies.reduce(
    (total, cubie) => total + cubie.stickers.length,
    0,
  );
}

export function getCubieByPosition(
  state: CubeState,
  position: Vec3,
): Cubie | undefined {
  return state.cubies.find((cubie) => samePosition(cubie.position, position));
}

export function cubieId(position: Vec3): string {
  return `${position.x},${position.y},${position.z}`;
}

export function samePosition(a: Vec3, b: Vec3): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export function faceFromNormal(normal: Vec3): Face {
  const match = ALL_FACES.find((face) =>
    samePosition(FACE_SPECS[face].normal, normal),
  );

  if (!match) {
    throw new Error(`Invalid face normal: ${cubieId(normal)}`);
  }

  return match;
}

function isOuterSticker(position: Vec3, normal: Vec3): boolean {
  return (
    (normal.x !== 0 && position.x === normal.x) ||
    (normal.y !== 0 && position.y === normal.y) ||
    (normal.z !== 0 && position.z === normal.z)
  );
}

function facePositions(face: Face): Vec3[] {
  const positions: Vec3[] = [];

  const push = (x: Coordinate, y: Coordinate, z: Coordinate) => {
    positions.push({ x, y, z });
  };

  if (face === 'U') {
    for (const z of [-1, 0, 1] as const) {
      for (const x of [-1, 0, 1] as const) {
        push(x, 1, z);
      }
    }
  }

  if (face === 'D') {
    for (const z of [1, 0, -1] as const) {
      for (const x of [-1, 0, 1] as const) {
        push(x, -1, z);
      }
    }
  }

  if (face === 'F') {
    for (const y of [1, 0, -1] as const) {
      for (const x of [-1, 0, 1] as const) {
        push(x, y, 1);
      }
    }
  }

  if (face === 'B') {
    for (const y of [1, 0, -1] as const) {
      for (const x of [1, 0, -1] as const) {
        push(x, y, -1);
      }
    }
  }

  if (face === 'R') {
    for (const y of [1, 0, -1] as const) {
      for (const z of [1, 0, -1] as const) {
        push(1, y, z);
      }
    }
  }

  if (face === 'L') {
    for (const y of [1, 0, -1] as const) {
      for (const z of [-1, 0, 1] as const) {
        push(-1, y, z);
      }
    }
  }

  return positions;
}
