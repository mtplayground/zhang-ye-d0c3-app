import { describe, expect, it } from 'vitest';
import {
  beginOrbitDrag,
  createOrbitState,
  endOrbitDrag,
  stepOrbitInertia,
  updateOrbitDrag,
} from './viewControls';

describe('view orbit controls', () => {
  it('updates yaw and pitch while dragging', () => {
    const orbit = createOrbitState({ yaw: 0, pitch: 0, radiansPerPixel: 0.01 });

    beginOrbitDrag(orbit, { x: 10, y: 10 });
    updateOrbitDrag(orbit, { x: 40, y: 0 }, { radiansPerPixel: 0.01 });

    expect(orbit.dragging).toBe(true);
    expect(orbit.yaw).toBeCloseTo(0.3);
    expect(orbit.pitch).toBeCloseTo(-0.1);
    expect(orbit.velocityYaw).toBeCloseTo(0.3);
    expect(orbit.velocityPitch).toBeCloseTo(-0.1);
  });

  it('keeps inertia after drag ends and damps it over time', () => {
    const orbit = createOrbitState({ yaw: 0, pitch: 0 });

    beginOrbitDrag(orbit, { x: 0, y: 0 });
    updateOrbitDrag(orbit, { x: 20, y: 5 });
    endOrbitDrag(orbit);

    const yawAfterDrag = orbit.yaw;
    const velocityAfterDrag = orbit.velocityYaw;

    stepOrbitInertia(orbit, 16.67);

    expect(orbit.dragging).toBe(false);
    expect(orbit.yaw).toBeGreaterThan(yawAfterDrag);
    expect(Math.abs(orbit.velocityYaw)).toBeLessThan(
      Math.abs(velocityAfterDrag),
    );
  });

  it('clamps pitch and cancels vertical velocity at the bounds', () => {
    const orbit = createOrbitState({ yaw: 0, pitch: 0, minPitch: -0.2 });

    beginOrbitDrag(orbit, { x: 0, y: 0 });
    updateOrbitDrag(orbit, { x: 0, y: -100 }, { minPitch: -0.2 });

    expect(orbit.pitch).toBe(-0.2);
    expect(orbit.velocityPitch).toBe(0);
  });
});
