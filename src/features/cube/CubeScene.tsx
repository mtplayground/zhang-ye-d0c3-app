import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import {
  FACE_SPECS,
  type Axis,
  type CubeState,
  type Move,
  type Vec3,
} from './model';
import {
  createClickLayerMove,
  resolveLayerMoveFromDrag,
  type LayerHit,
  type ScreenVector,
} from './layerInteraction';
import { CLASSIC_CUBE_HEX, getRenderCubies } from './rendering';
import { moveToNotation } from './moves';
import {
  beginOrbitDrag,
  createOrbitState,
  endOrbitDrag,
  stepOrbitInertia,
  updateOrbitDrag,
} from './viewControls';

type CubeSceneProps = {
  state: CubeState;
  onMoveCommit?: (move: Move) => void;
};

type LayerGesture = {
  pointerId: number;
  startPoint: ScreenVector;
  hit: LayerHit;
};

type LayerTurnAnimation = {
  move: Move;
  pivot: Group;
  axis: Axis;
  targetAngle: number;
  startedAt: number;
  durationMs: number;
};

const CUBIE_SIZE = 0.92;
const CUBIE_SPACING = 1.02;
const STICKER_SIZE = 0.66;
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.006;
const BASE_NORMAL = new Vector3(0, 0, 1);
const LAYER_DRAG_THRESHOLD_PX = 12;
const LAYER_TURN_DURATION_MS = 210;

export function CubeScene({ state, onMoveCommit }: CubeSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cubeGroupRef = useRef<Group | null>(null);
  const onMoveCommitRef = useRef(onMoveCommit);

  useEffect(() => {
    onMoveCommitRef.current = onMoveCommit;
  }, [onMoveCommit]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return undefined;
    }

    const scene = new Scene();
    const camera = new PerspectiveCamera(38, 1, 0.1, 100);
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    const cubeGroup = new Group();
    const orbit = createOrbitState();
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    let layerGesture: LayerGesture | null = null;
    let activeLayerTurn: LayerTurnAnimation | null = null;
    cubeGroupRef.current = cubeGroup;

    camera.position.set(4.4, 3.4, 5.3);
    camera.lookAt(0, 0, 0);

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.dataset.testid = 'cube-webgl-canvas';
    renderer.domElement.dataset.interactionMode = 'view-orbit';
    renderer.domElement.setAttribute(
      'aria-label',
      '可拖拽旋转视角的经典六色 3D 魔方',
    );

    scene.add(cubeGroup);
    scene.add(new AmbientLight(0xffffff, 1.6));

    const keyLight = new DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new DirectionalLight(0xd8ecff, 1.2);
    fillLight.position.set(-5, 2, -4);
    scene.add(fillLight);

    const hemisphere = new HemisphereLight(0xf8fbff, 0xd2d6dc, 1.1);
    scene.add(hemisphere);

    cubeGroup.rotation.set(-0.22, 0.52, 0.02);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    host.appendChild(renderer.domElement);
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const handlePointerDown = (event: PointerEvent) => {
      if (activeLayerTurn) {
        return;
      }

      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      const hit = pickLayerHit(
        event,
        renderer.domElement,
        camera,
        cubeGroup,
        raycaster,
        pointer,
      );

      if (hit) {
        layerGesture = {
          pointerId: event.pointerId,
          startPoint: pointFromPointerEvent(event),
          hit,
        };
        renderer.domElement.setPointerCapture(event.pointerId);
        renderer.domElement.classList.add('is-turning-candidate');
        event.preventDefault();
        return;
      }

      beginOrbitDrag(orbit, pointFromPointerEvent(event));
      renderer.domElement.setPointerCapture(event.pointerId);
      renderer.domElement.classList.add('is-dragging');
      event.preventDefault();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (layerGesture?.pointerId === event.pointerId) {
        const point = pointFromPointerEvent(event);
        const drag = {
          x: point.x - layerGesture.startPoint.x,
          y: point.y - layerGesture.startPoint.y,
        };

        if (Math.hypot(drag.x, drag.y) >= LAYER_DRAG_THRESHOLD_PX) {
          const move = resolveLayerMoveFromDrag(
            layerGesture.hit,
            drag,
            (tangent) => projectCubeTangentToScreen(tangent, camera, cubeGroup),
          );

          if (move) {
            activeLayerTurn = startLayerTurn(
              cubeGroup,
              move,
              performance.now(),
            );
            renderer.domElement.dataset.interactionMode = 'layer-turn';
          }

          layerGesture = null;
          renderer.domElement.classList.remove('is-turning-candidate');
        }

        event.preventDefault();
        return;
      }

      updateOrbitDrag(orbit, pointFromPointerEvent(event));

      if (orbit.dragging) {
        event.preventDefault();
      }
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (layerGesture?.pointerId === event.pointerId) {
        activeLayerTurn = startLayerTurn(
          cubeGroup,
          createClickLayerMove(layerGesture.hit),
          performance.now(),
        );
        renderer.domElement.dataset.interactionMode = 'layer-turn';
        layerGesture = null;
      }

      endOrbitDrag(orbit);
      renderer.domElement.classList.remove('is-dragging');
      renderer.domElement.classList.remove('is-turning-candidate');

      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerEnd);
    renderer.domElement.addEventListener('pointercancel', handlePointerEnd);
    renderer.domElement.addEventListener(
      'lostpointercapture',
      handlePointerEnd,
    );

    let animationFrame = 0;
    let previousFrameTime = performance.now();
    let committedMoveCount = 0;

    const render = (time: number) => {
      const deltaMs = time - previousFrameTime;
      previousFrameTime = time;
      const completedTurn = activeLayerTurn
        ? updateLayerTurnAnimation(activeLayerTurn, time)
        : null;

      if (completedTurn) {
        activeLayerTurn = null;
        renderer.domElement.dataset.interactionMode = 'view-orbit';
        committedMoveCount += 1;
        renderer.domElement.dataset.moveCount = String(committedMoveCount);
        renderer.domElement.dataset.lastMove = moveToNotation(
          completedTurn.move,
        );
        onMoveCommitRef.current?.(completedTurn.move);
      }

      if (!activeLayerTurn) {
        stepOrbitInertia(orbit, deltaMs);
      }

      cubeGroup.rotation.y = orbit.yaw;
      cubeGroup.rotation.x = orbit.pitch;
      cubeGroup.rotation.z = 0.02;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerEnd);
      renderer.domElement.removeEventListener(
        'pointercancel',
        handlePointerEnd,
      );
      renderer.domElement.removeEventListener(
        'lostpointercapture',
        handlePointerEnd,
      );
      resizeObserver.disconnect();
      host.removeChild(renderer.domElement);
      disposeGroup(cubeGroup);
      cubeGroupRef.current = null;
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!cubeGroupRef.current) {
      return;
    }

    rebuildCubeGroup(cubeGroupRef.current, state);
  }, [state]);

  return (
    <div
      ref={hostRef}
      className="cube-canvas-host"
      data-testid="cube-canvas-host"
    />
  );
}

function pointFromPointerEvent(event: PointerEvent) {
  return {
    x: event.clientX,
    y: event.clientY,
  };
}

function pickLayerHit(
  event: PointerEvent,
  canvas: HTMLCanvasElement,
  camera: PerspectiveCamera,
  cubeGroup: Group,
  raycaster: Raycaster,
  pointer: Vector2,
): LayerHit | null {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  cubeGroup.updateMatrixWorld(true);
  raycaster.setFromCamera(pointer, camera);

  const intersections = raycaster.intersectObjects(cubeGroup.children, true);
  const stickerIntersection = intersections.find((intersection) =>
    isLayerHitData(intersection.object.userData.layerHit),
  );

  return stickerIntersection?.object.userData.layerHit ?? null;
}

function projectCubeTangentToScreen(
  tangent: Vec3,
  camera: PerspectiveCamera,
  cubeGroup: Group,
): ScreenVector | null {
  const origin = new Vector3(0, 0, 0);
  const endpoint = new Vector3(tangent.x, tangent.y, tangent.z);

  cubeGroup.localToWorld(origin);
  cubeGroup.localToWorld(endpoint);
  origin.project(camera);
  endpoint.project(camera);

  const screenVector = {
    x: endpoint.x - origin.x,
    y: origin.y - endpoint.y,
  };

  if (Math.hypot(screenVector.x, screenVector.y) < 0.0001) {
    return null;
  }

  return screenVector;
}

function startLayerTurn(
  cubeGroup: Group,
  move: Move,
  startedAt: number,
): LayerTurnAnimation | null {
  const spec = FACE_SPECS[move.face];
  const affectedCubies = cubeGroup.children.filter(
    (child) => child.userData.cubiePosition?.[spec.axis] === spec.layer,
  );

  if (affectedCubies.length === 0) {
    return null;
  }

  const pivot = new Group();
  pivot.name = `layer-turn-${move.face}`;
  cubeGroup.add(pivot);

  for (const cubie of affectedCubies) {
    pivot.add(cubie);
  }

  return {
    move,
    pivot,
    axis: spec.axis,
    targetAngle: quarterTurnsForMove(move) * (Math.PI / 2),
    startedAt,
    durationMs: LAYER_TURN_DURATION_MS,
  };
}

function updateLayerTurnAnimation(
  animation: LayerTurnAnimation,
  time: number,
): LayerTurnAnimation | null {
  const progress = Math.min(
    1,
    (time - animation.startedAt) / animation.durationMs,
  );
  const easedProgress = easeOutCubic(progress);

  animation.pivot.rotation[animation.axis] =
    animation.targetAngle * easedProgress;

  return progress >= 1 ? animation : null;
}

function quarterTurnsForMove(move: Move): number {
  const spec = FACE_SPECS[move.face];

  if (move.amount === 2) {
    return 2;
  }

  return move.direction === 'clockwise' ? -spec.layer : spec.layer;
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

function isLayerHitData(value: unknown): value is LayerHit {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<LayerHit>;

  return Boolean(candidate.position && candidate.normal);
}

function rebuildCubeGroup(group: Group, state: CubeState) {
  disposeGroup(group);

  const cubieGeometry = new BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
  const stickerGeometry = new PlaneGeometry(STICKER_SIZE, STICKER_SIZE);
  const coreMaterial = new MeshStandardMaterial({
    color: new Color('#111827'),
    roughness: 0.58,
    metalness: 0.04,
  });

  for (const cubie of getRenderCubies(state)) {
    const cubieGroup = new Group();
    cubieGroup.name = `cubie-${cubie.id}`;
    cubieGroup.userData.cubiePosition = { ...cubie.position };
    cubieGroup.position.set(
      cubie.position.x * CUBIE_SPACING,
      cubie.position.y * CUBIE_SPACING,
      cubie.position.z * CUBIE_SPACING,
    );

    const core = new Mesh(cubieGeometry, coreMaterial);
    core.castShadow = true;
    core.receiveShadow = true;
    cubieGroup.add(core);

    for (const sticker of cubie.stickers) {
      const normal = vectorFromVec3(sticker.normal);
      const stickerMesh = new Mesh(
        stickerGeometry,
        createStickerMaterial(CLASSIC_CUBE_HEX[sticker.color]),
      );

      stickerMesh.userData.layerHit = {
        position: { ...cubie.position },
        normal: { ...sticker.normal },
      } satisfies LayerHit;
      stickerMesh.position.copy(normal.clone().multiplyScalar(STICKER_OFFSET));
      stickerMesh.quaternion.copy(
        new Quaternion().setFromUnitVectors(BASE_NORMAL, normal),
      );
      stickerMesh.castShadow = true;
      cubieGroup.add(stickerMesh);
    }

    group.add(cubieGroup);
  }
}

function createStickerMaterial(color: string) {
  return new MeshStandardMaterial({
    color: new Color(color),
    roughness: 0.42,
    metalness: 0.02,
    map: createStickerTexture(color),
  });
}

function createStickerTexture(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;

  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = 'rgba(255,255,255,0.45)';
  context.lineWidth = 5;
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  return texture;
}

function vectorFromVec3(vector: Vec3) {
  return new Vector3(vector.x, vector.y, vector.z).normalize();
}

function disposeGroup(group: Group) {
  while (group.children.length > 0) {
    const child = group.children.pop();

    if (!child) {
      continue;
    }

    if (child instanceof Group) {
      disposeGroup(child);
    }

    if (child instanceof Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      for (const material of materials) {
        if (material instanceof MeshStandardMaterial) {
          material.map?.dispose();
        }

        material.dispose();
      }
    }
  }
}
