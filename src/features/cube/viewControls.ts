export type OrbitPoint = {
  x: number;
  y: number;
};

export type OrbitState = {
  yaw: number;
  pitch: number;
  velocityYaw: number;
  velocityPitch: number;
  dragging: boolean;
  lastPoint: OrbitPoint | null;
};

export type OrbitOptions = {
  yaw?: number;
  pitch?: number;
  minPitch?: number;
  maxPitch?: number;
  radiansPerPixel?: number;
  dampingPerFrame?: number;
};

const DEFAULT_YAW = 0.52;
const DEFAULT_PITCH = -0.22;
const DEFAULT_MIN_PITCH = -1.18;
const DEFAULT_MAX_PITCH = 1.18;
const DEFAULT_RADIANS_PER_PIXEL = 0.008;
const DEFAULT_DAMPING_PER_FRAME = 0.9;
const FRAME_MS = 1000 / 60;
const STOP_EPSILON = 0.00008;

export function createOrbitState(options: OrbitOptions = {}): OrbitState {
  return {
    yaw: options.yaw ?? DEFAULT_YAW,
    pitch: clamp(
      options.pitch ?? DEFAULT_PITCH,
      options.minPitch ?? DEFAULT_MIN_PITCH,
      options.maxPitch ?? DEFAULT_MAX_PITCH,
    ),
    velocityYaw: 0,
    velocityPitch: 0,
    dragging: false,
    lastPoint: null,
  };
}

export function beginOrbitDrag(state: OrbitState, point: OrbitPoint): void {
  state.dragging = true;
  state.lastPoint = point;
  state.velocityYaw = 0;
  state.velocityPitch = 0;
}

export function updateOrbitDrag(
  state: OrbitState,
  point: OrbitPoint,
  options: OrbitOptions = {},
): void {
  if (!state.dragging || !state.lastPoint) {
    return;
  }

  const radiansPerPixel = options.radiansPerPixel ?? DEFAULT_RADIANS_PER_PIXEL;
  const minPitch = options.minPitch ?? DEFAULT_MIN_PITCH;
  const maxPitch = options.maxPitch ?? DEFAULT_MAX_PITCH;
  const deltaX = point.x - state.lastPoint.x;
  const deltaY = point.y - state.lastPoint.y;
  const nextVelocityYaw = deltaX * radiansPerPixel;
  const nextVelocityPitch = deltaY * radiansPerPixel;

  state.yaw += nextVelocityYaw;
  state.pitch = clamp(state.pitch + nextVelocityPitch, minPitch, maxPitch);
  state.velocityYaw = nextVelocityYaw;
  state.velocityPitch =
    state.pitch === minPitch || state.pitch === maxPitch
      ? 0
      : nextVelocityPitch;
  state.lastPoint = point;
}

export function endOrbitDrag(state: OrbitState): void {
  state.dragging = false;
  state.lastPoint = null;
}

export function stepOrbitInertia(
  state: OrbitState,
  deltaMs: number,
  options: OrbitOptions = {},
): void {
  if (state.dragging) {
    return;
  }

  const frameScale = Math.max(0.25, Math.min(3, deltaMs / FRAME_MS));
  const minPitch = options.minPitch ?? DEFAULT_MIN_PITCH;
  const maxPitch = options.maxPitch ?? DEFAULT_MAX_PITCH;

  state.yaw += state.velocityYaw * frameScale;
  state.pitch = clamp(
    state.pitch + state.velocityPitch * frameScale,
    minPitch,
    maxPitch,
  );

  const damping = Math.pow(
    options.dampingPerFrame ?? DEFAULT_DAMPING_PER_FRAME,
    frameScale,
  );
  state.velocityYaw *= damping;
  state.velocityPitch *= damping;

  if (Math.abs(state.velocityYaw) < STOP_EPSILON) {
    state.velocityYaw = 0;
  }

  if (
    Math.abs(state.velocityPitch) < STOP_EPSILON ||
    state.pitch === minPitch ||
    state.pitch === maxPitch
  ) {
    state.velocityPitch = 0;
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
