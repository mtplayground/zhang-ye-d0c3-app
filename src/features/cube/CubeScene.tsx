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
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { CubeState, Vec3 } from './model';
import { CLASSIC_CUBE_HEX, getRenderCubies } from './rendering';

type CubeSceneProps = {
  state: CubeState;
};

const CUBIE_SIZE = 0.92;
const CUBIE_SPACING = 1.02;
const STICKER_SIZE = 0.66;
const STICKER_OFFSET = CUBIE_SIZE / 2 + 0.006;
const BASE_NORMAL = new Vector3(0, 0, 1);

export function CubeScene({ state }: CubeSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cubeGroupRef = useRef<Group | null>(null);

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
    cubeGroupRef.current = cubeGroup;

    camera.position.set(4.4, 3.4, 5.3);
    camera.lookAt(0, 0, 0);

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.dataset.testid = 'cube-webgl-canvas';
    renderer.domElement.setAttribute('aria-label', '经典六色 3D 魔方');

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

    let animationFrame = 0;
    const startedAt = performance.now();

    const render = (time: number) => {
      const elapsed = (time - startedAt) / 1000;
      cubeGroup.rotation.y = 0.52 + Math.sin(elapsed * 0.24) * 0.08;
      cubeGroup.rotation.x = -0.22 + Math.sin(elapsed * 0.18) * 0.025;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
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
