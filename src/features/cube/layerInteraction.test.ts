import { describe, expect, it } from 'vitest';
import {
  createClickLayerMove,
  resolveLayerMoveFromDrag,
  type ScreenVector,
} from './layerInteraction';
import type { Vec3 } from './model';

const identityProjector = (tangent: Vec3): ScreenVector => ({
  x: tangent.x,
  y: -tangent.y,
});

describe('layer interaction resolver', () => {
  it('turns the clicked visible face when there is no drag intent', () => {
    expect(
      createClickLayerMove({
        position: { x: 1, y: 1, z: 1 },
        normal: { x: 0, y: 0, z: 1 },
      }),
    ).toEqual({ face: 'F', direction: 'clockwise', amount: 1 });
  });

  it('maps a horizontal drag on the front top row to the U layer', () => {
    const move = resolveLayerMoveFromDrag(
      {
        position: { x: 0, y: 1, z: 1 },
        normal: { x: 0, y: 0, z: 1 },
      },
      { x: 80, y: 4 },
      identityProjector,
    );

    expect(move).toEqual({
      face: 'U',
      direction: 'counterclockwise',
      amount: 1,
    });
  });

  it('maps a vertical drag on the front right column to the R layer', () => {
    const move = resolveLayerMoveFromDrag(
      {
        position: { x: 1, y: 0, z: 1 },
        normal: { x: 0, y: 0, z: 1 },
      },
      { x: 2, y: 80 },
      identityProjector,
    );

    expect(move).toEqual({
      face: 'R',
      direction: 'counterclockwise',
      amount: 1,
    });
  });

  it('falls back to a face turn when dragging from a center sticker', () => {
    const move = resolveLayerMoveFromDrag(
      {
        position: { x: 0, y: 0, z: 1 },
        normal: { x: 0, y: 0, z: 1 },
      },
      { x: 80, y: 0 },
      identityProjector,
    );

    expect(move).toEqual({ face: 'F', direction: 'clockwise', amount: 1 });
  });
});
