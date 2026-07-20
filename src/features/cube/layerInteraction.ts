import {
  type Axis,
  type Coordinate,
  FACE_SPECS,
  type Move,
  type Vec3,
  faceFromNormal,
} from './model';

export type LayerHit = {
  position: Vec3;
  normal: Vec3;
};

export type ScreenVector = {
  x: number;
  y: number;
};

export type TangentProjector = (tangent: Vec3) => ScreenVector | null;

const AXES: readonly Axis[] = ['x', 'y', 'z'];
const AXIS_VECTORS: Record<Axis, Vec3> = {
  x: { x: 1, y: 0, z: 0 },
  y: { x: 0, y: 1, z: 0 },
  z: { x: 0, y: 0, z: 1 },
};

export function createClickLayerMove(hit: LayerHit): Move {
  return {
    face: faceFromNormal(hit.normal),
    direction: 'clockwise',
    amount: 1,
  };
}

export function resolveLayerMoveFromDrag(
  hit: LayerHit,
  drag: ScreenVector,
  projectTangent: TangentProjector,
): Move | null {
  const normalizedDrag = normalizeScreenVector(drag);

  if (!normalizedDrag) {
    return null;
  }

  const candidates = AXES.flatMap((axis) => {
    if (hit.normal[axis] !== 0 || hit.position[axis] === 0) {
      return [];
    }

    const tangent = cross(AXIS_VECTORS[axis], hit.normal);
    const projectedTangent = projectTangent(tangent);
    const normalizedTangent = projectedTangent
      ? normalizeScreenVector(projectedTangent)
      : null;

    if (!normalizedTangent) {
      return [];
    }

    const signedDot = dot(normalizedDrag, normalizedTangent);
    const layer = hit.position[axis] as -1 | 1;
    const signedTurn = (signedDot >= 0 ? 1 : -1) as -1 | 1;

    return [
      {
        axis,
        layer,
        signedTurn,
        score: Math.abs(signedDot),
      },
    ];
  }).sort((a, b) => b.score - a.score);

  const best = candidates[0];

  if (!best || best.score < 0.35) {
    return createClickLayerMove(hit);
  }

  return moveFromAxisLayerTurn(best.axis, best.layer, best.signedTurn);
}

function moveFromAxisLayerTurn(
  axis: Axis,
  layer: -1 | 1,
  signedTurn: -1 | 1,
): Move {
  const face = Object.entries(FACE_SPECS).find(
    ([, spec]) => spec.axis === axis && spec.layer === layer,
  )?.[0] as Move['face'] | undefined;

  if (!face) {
    throw new Error(`Cannot resolve move for axis ${axis} layer ${layer}`);
  }

  return {
    face,
    direction: signedTurn === layer ? 'counterclockwise' : 'clockwise',
    amount: 1,
  };
}

function normalizeScreenVector(vector: ScreenVector): ScreenVector | null {
  const length = Math.hypot(vector.x, vector.y);

  if (length < 0.0001) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function dot(a: ScreenVector, b: ScreenVector): number {
  return a.x * b.x + a.y * b.y;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: toCoordinate(a.y * b.z - a.z * b.y),
    y: toCoordinate(a.z * b.x - a.x * b.z),
    z: toCoordinate(a.x * b.y - a.y * b.x),
  };
}

function toCoordinate(value: number): Coordinate {
  if (value > 0) {
    return 1;
  }

  if (value < 0) {
    return -1;
  }

  return 0;
}
