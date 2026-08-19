"use client";

import { useEffect, useMemo, useState } from "react";
import { useGSAP } from "@gsap/react";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import type { Seal3dModel } from "@fangcun/seal-3d";
import gsap from "gsap";
import {
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

declare global {
  interface Window {
    __fangcun3dModuleLoaded?: boolean;
    __fangcun3dCameraMotion?: "gsap" | "static";
  }
}

if (typeof window !== "undefined") {
  window.__fangcun3dModuleLoaded = true;
}

export type Seal3dView = "face" | "side" | "knob";

type Seal3dCanvasProps = {
  model: Seal3dModel;
  onFallback: (reason: string) => void;
  onReady: () => void;
  posterSvg: string;
  view: Seal3dView;
};

const viewPositions: Record<Seal3dView, [number, number, number]> = {
  face: [0, -5, 0.001],
  side: [6.2, 1.4, 0.4],
  knob: [4.6, 4.8, 5.4],
};

function CameraRig({ view }: { view: Seal3dView }) {
  const { camera, invalidate } = useThree();

  useGSAP(() => {
    const [x, y, z] = viewPositions[view];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.__fangcun3dCameraMotion = reducedMotion ? "static" : "gsap";
    const targetUp = view === "face" ? [0, 0, -1] : [0, 1, 0];
    const state = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      upX: camera.up.x,
      upY: camera.up.y,
      upZ: camera.up.z,
    };
    const renderCamera = () => {
      camera.position.set(state.x, state.y, state.z);
      camera.up.set(state.upX, state.upY, state.upZ);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      invalidate();
    };
    if (reducedMotion) {
      Object.assign(state, { x, y, z, upX: targetUp[0], upY: targetUp[1], upZ: targetUp[2] });
      renderCamera();
      return;
    }
    const tween = gsap.to(state, {
      duration: 0.52,
      ease: "power2.inOut",
      overwrite: "auto",
      upX: targetUp[0],
      upY: targetUp[1],
      upZ: targetUp[2],
      x,
      y,
      z,
      onUpdate: renderCamera,
    });
    return () => tween.kill();
  }, { dependencies: [camera, invalidate, view], revertOnUpdate: true });

  return null;
}

function ContextLifecycle({ onFallback }: Pick<Seal3dCanvasProps, "onFallback">) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onFallback("WEBGL_CONTEXT_LOST");
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);
    return () => canvas.removeEventListener("webglcontextlost", handleContextLost);
  }, [gl, onFallback]);

  return null;
}

function usePosterTexture(
  posterSvg: string,
  onReady: () => void,
  onFallback: (reason: string) => void,
): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    let disposed = false;
    const source = new Blob([posterSvg], { type: "image/svg+xml;charset=utf-8" });
    const sourceUrl = URL.createObjectURL(source);
    const image = new Image();

    image.onload = () => {
      if (disposed) return;
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 768;
      const context = canvas.getContext("2d");
      if (!context) {
        onFallback("VIEWER3D_ASSET_FAILED");
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const nextTexture = new CanvasTexture(canvas);
      nextTexture.colorSpace = SRGBColorSpace;
      nextTexture.needsUpdate = true;
      setTexture((current) => {
        current?.dispose();
        return nextTexture;
      });
      invalidate();
      onReady();
    };
    image.onerror = () => onFallback("VIEWER3D_ASSET_FAILED");
    image.src = sourceUrl;

    return () => {
      disposed = true;
      URL.revokeObjectURL(sourceUrl);
    };
  }, [invalidate, onFallback, onReady, posterSvg]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
}

function StoneMaterial({ map, model }: { map: Texture; model: Seal3dModel }) {
  return (
    <meshPhysicalMaterial
      clearcoat={model.material.clearcoat}
      clearcoatRoughness={model.material.clearcoatRoughness}
      color="#FFFFFF"
      map={map}
      metalness={model.material.metalness}
      roughness={model.material.roughness}
    />
  );
}

function SealKnob({ map, model }: { map: Texture; model: Seal3dModel }) {
  const top = model.sceneScale.height / 2;

  if (model.knobVariant === "arched") {
    return (
      <mesh position={[0, top + 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.7, 0.7, 0.7]}>
        <torusGeometry args={[0.48, 0.16, 16, 48, Math.PI]} />
        <StoneMaterial map={map} model={model} />
      </mesh>
    );
  }

  if (model.knobVariant === "rounded") {
    return (
      <mesh position={[0, top + 0.34, 0]} scale={[0.65, 0.5, 0.65]}>
        <sphereGeometry args={[0.65, 32, 20]} />
        <StoneMaterial map={map} model={model} />
      </mesh>
    );
  }

  return (
    <mesh position={[0, top + 0.28, 0]}>
      <boxGeometry args={[0.88, 0.5, 0.62]} />
      <StoneMaterial map={map} model={model} />
    </mesh>
  );
}

function createMaterialTexture(material: Seal3dModel["material"]): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D unavailable");
  context.fillStyle = material.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = material.secondaryColor;
  context.strokeStyle = material.secondaryColor;

  if (material.pattern === "grain") {
    context.globalAlpha = 0.4;
    context.lineWidth = 2;
    for (let index = 0; index < 28; index += 1) {
      const x = (index * 41) % 272 - 8;
      context.beginPath();
      context.moveTo(x, -8);
      context.bezierCurveTo(x + 18, 56, x - 15, 168, x + 12, 264);
      context.stroke();
    }
  } else if (material.pattern === "patina") {
    context.globalAlpha = 0.3;
    for (let index = 0; index < 22; index += 1) {
      const x = (index * 83) % 256;
      const y = (index * 47) % 256;
      const radius = 5 + (index * 7) % 18;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  } else if (material.pattern === "speckle") {
    context.globalAlpha = 0.28;
    for (let index = 0; index < 120; index += 1) {
      const x = (index * 71) % 256;
      const y = (index * 113) % 256;
      const size = 1 + index % 3;
      context.fillRect(x, y, size, size);
    }
  } else {
    context.globalAlpha = material.pattern === "cloud" ? 0.18 : 0.24;
    for (let index = 0; index < 30; index += 1) {
      const x = (index * 67) % 256;
      const y = (index * 109) % 256;
      context.beginPath();
      context.ellipse(x, y, 12 + index % 19, 4 + index % 9, index * 0.31, 0, Math.PI * 2);
      context.fill();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(material.pattern === "grain" ? 1 : 2, material.pattern === "grain" ? 2 : 4);
  texture.needsUpdate = true;
  return texture;
}

function createGlyphReliefGeometry(posterSvg: string, model: Seal3dModel): ExtrudeGeometry | null {
  const loader = new SVGLoader();
  const parsed = loader.parse(posterSvg);
  const paths = parsed.paths.filter((path) => {
    const node = path.userData?.node as Element | undefined;
    return Boolean(node?.getAttribute("data-char"));
  });
  const shapes = paths.flatMap((path) => SVGLoader.createShapes(path));
  if (shapes.length === 0) return null;
  const depth = Math.min(model.glyphRelief.depthScale, model.glyphRelief.maxDepthScale);
  const geometry = new ExtrudeGeometry(shapes, {
    bevelEnabled: false,
    curveSegments: 2,
    depth,
    steps: 1,
  });
  geometry.translate(-500, -500, 0);
  geometry.scale(
    (model.sceneScale.width * 0.94) / 1000,
    -(model.sceneScale.depth * 0.94) / 1000,
    Math.sign(model.glyphRelief.signedDepthScale),
  );
  return geometry;
}

function GlyphRelief({ model, posterSvg }: { model: Seal3dModel; posterSvg: string }) {
  const geometry = useMemo(() => {
    try {
      return createGlyphReliefGeometry(posterSvg, model);
    } catch {
      return null;
    }
  }, [model, posterSvg]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      position={[0, -model.sceneScale.height / 2 - 0.006, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      renderOrder={2}
      userData={{
        glyphReliefDepthScale: model.glyphRelief.depthScale,
        glyphReliefMode: model.glyphRelief.mode,
        glyphReliefSignedDepthScale: model.glyphRelief.signedDepthScale,
        glyphReliefSource: model.glyphRelief.source,
      }}
    >
      <meshBasicMaterial
        color={model.glyphRelief.mode === "recessed" ? "#4E1714" : "#B3261E"}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
        toneMapped={false}
      />
    </mesh>
  );
}

function drawInscription(
  context: CanvasRenderingContext2D,
  text: string,
  script: Seal3dModel["inscription"]["script"],
  knife: Seal3dModel["inscription"]["knife"],
  color: string,
) {
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineJoin = "round";
  context.lineWidth = knife === "double" ? 5 : 1.5;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${script === "lishu" ? 62 : 58}px "Noto Serif SC Variable", "Source Han Serif SC", serif`;
  const characters = Array.from(text).slice(0, 32);
  const rowLimit = 10;
  const columns = Math.max(1, Math.ceil(characters.length / rowLimit));
  const firstX = context.canvas.width / 2 + (columns - 1) * 58 / 2;
  for (const [index, character] of characters.entries()) {
    const column = Math.floor(index / rowLimit);
    const row = index % rowLimit;
    if (knife === "double") context.strokeText(character, firstX - column * 58, 82 + row * 62);
    context.fillText(character, firstX - column * 58, 82 + row * 62);
  }
}

function createInscriptionTextures(
  text: string,
  script: Seal3dModel["inscription"]["script"],
  knife: Seal3dModel["inscription"]["knife"],
  surface: Seal3dModel["inscription"]["rendering"]["surface"],
) {
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = 384;
  colorCanvas.height = 768;
  const colorContext = colorCanvas.getContext("2d");
  if (!colorContext) throw new Error("Canvas 2D unavailable");
  colorContext.clearRect(0, 0, colorCanvas.width, colorCanvas.height);
  drawInscription(colorContext, text, script, knife, "#4b2b20");

  const depthCanvas = document.createElement("canvas");
  depthCanvas.width = 384;
  depthCanvas.height = 768;
  const depthContext = depthCanvas.getContext("2d");
  if (!depthContext) throw new Error("Canvas 2D unavailable");
  depthContext.fillStyle = "#000000";
  depthContext.fillRect(0, 0, depthCanvas.width, depthCanvas.height);
  drawInscription(depthContext, text, script, knife, "#ffffff");

  const colorMap = new CanvasTexture(colorCanvas);
  colorMap.colorSpace = SRGBColorSpace;
  const depthMap = new CanvasTexture(depthCanvas);
  if (surface === "cylindrical") {
    for (const texture of [colorMap, depthMap]) {
      texture.wrapS = RepeatWrapping;
      texture.repeat.x = -1;
      texture.offset.x = 1;
    }
  }
  colorMap.needsUpdate = true;
  depthMap.needsUpdate = true;
  return { colorMap, depthMap };
}

const cylindricalThetaStarts: Record<Seal3dModel["inscription"]["side"], number> = {
  front: -Math.PI / 4,
  right: Math.PI / 4,
  back: Math.PI * 3 / 4,
  left: Math.PI * 5 / 4,
};

function SideInscription({
  depth,
  face,
  height,
  model,
  width,
}: {
  depth: number;
  face: Seal3dModel["inscription"]["faces"][number];
  height: number;
  model: Seal3dModel;
  width: number;
}) {
  const textures = useMemo(
    () => createInscriptionTextures(
      face.text,
      model.inscription.script,
      model.inscription.knife,
      model.inscription.rendering.surface,
    ),
    [face.text, model.inscription.knife, model.inscription.rendering.surface, model.inscription.script],
  );
  useEffect(() => () => {
    textures.colorMap.dispose();
    textures.depthMap.dispose();
  }, [textures]);
  const isFrontBack = face.side === "front" || face.side === "back";
  const panelWidth = (isFrontBack ? width : depth) * 0.72;
  const panelHeight = height * 0.72;
  const material = (
    <meshPhysicalMaterial
      alphaTest={0.05}
      bumpMap={textures.depthMap}
      bumpScale={-model.inscription.rendering.depthScale}
      map={textures.colorMap}
      metalness={0}
      roughness={0.88}
      side={DoubleSide}
      transparent
    />
  );

  if (model.inscription.rendering.surface === "cylindrical") {
    return (
      <mesh userData={{
        inscriptionDepthScale: model.inscription.rendering.depthScale,
        inscriptionKnife: model.inscription.knife,
        inscriptionSide: face.side,
        inscriptionSurface: "cylindrical",
      }}>
        <cylinderGeometry
          args={[
            width / 2 + 0.008,
            width / 2 + 0.008,
            panelHeight,
            24,
            1,
            true,
            cylindricalThetaStarts[face.side],
            Math.PI / 2,
          ]}
        />
        {material}
      </mesh>
    );
  }

  const position: [number, number, number] = face.side === "front"
    ? [0, 0, depth / 2 + 0.008]
    : face.side === "back"
      ? [0, 0, -depth / 2 - 0.008]
      : face.side === "right"
        ? [width / 2 + 0.008, 0, 0]
        : [-width / 2 - 0.008, 0, 0];
  const rotation: [number, number, number] = face.side === "front"
    ? [0, 0, 0]
    : face.side === "back"
      ? [0, Math.PI, 0]
      : face.side === "right"
        ? [0, Math.PI / 2, 0]
        : [0, -Math.PI / 2, 0];
  return (
    <mesh position={position} rotation={rotation} userData={{
      inscriptionDepthScale: model.inscription.rendering.depthScale,
      inscriptionKnife: model.inscription.knife,
      inscriptionSide: face.side,
      inscriptionSurface: "planar",
    }}>
      <planeGeometry args={[panelWidth, panelHeight]} />
      {material}
    </mesh>
  );
}

function SealStone({
  model,
  onFallback,
  onReady,
  posterSvg,
}: Omit<Seal3dCanvasProps, "view">) {
  const texture = usePosterTexture(posterSvg, onReady, onFallback);
  const materialTexture = useMemo(() => createMaterialTexture(model.material), [model.material]);
  useEffect(() => () => materialTexture.dispose(), [materialTexture]);
  const { width, depth, height } = model.sceneScale;

  return (
    <group rotation={[0, -0.1, 0]}>
      <mesh castShadow receiveShadow>
        {model.profile === "cylinder" ? (
          <cylinderGeometry args={[width / 2, width / 2, height, 64]} />
        ) : (
          <boxGeometry args={[width, height, depth]} />
        )}
        <StoneMaterial map={materialTexture} model={model} />
      </mesh>
      {texture ? (
        <mesh position={[0, -height / 2 - 0.006, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {model.profile === "cylinder" ? (
            <circleGeometry args={[width / 2 * 0.94, 64]} />
          ) : (
            <planeGeometry args={[width * 0.94, depth * 0.94]} />
          )}
          <meshBasicMaterial map={texture} side={DoubleSide} toneMapped={false} />
        </mesh>
      ) : null}
      <GlyphRelief model={model} posterSvg={posterSvg} />
      {model.inscription.enabled ? model.inscription.faces.map((face) => (
        <SideInscription
          depth={depth}
          face={face}
          height={height}
          key={face.side}
          model={model}
          width={width}
        />
      )) : null}
      <SealKnob map={materialTexture} model={model} />
    </group>
  );
}

export function Seal3dCanvas({
  model,
  onFallback,
  onReady,
  posterSvg,
  view,
}: Seal3dCanvasProps) {
  const maxDpr = typeof window !== "undefined" && window.innerWidth < 768 ? 1.5 : 2;

  return (
    <Canvas
      camera={{ far: 100, fov: 42, near: 0.1, position: viewPositions.knob }}
      dpr={[1, maxDpr]}
      frameloop="demand"
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      shadows="basic"
    >
      <color args={["#EEE6D8"]} attach="background" />
      <ambientLight intensity={1.25} />
      <directionalLight castShadow intensity={2.2} position={[-4, 7, 5]} shadow-mapSize={[1024, 1024]} />
      <directionalLight color="#D9B891" intensity={0.65} position={[4, 1, -3]} />
      <SealStone model={model} onFallback={onFallback} onReady={onReady} posterSvg={posterSvg} />
      <mesh position={[0, -model.sceneScale.height / 2 - 0.06, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 14]} />
        <shadowMaterial opacity={0.16} />
      </mesh>
      <CameraRig view={view} />
      <ContextLifecycle onFallback={onFallback} />
      <OrbitControls
        enableDamping={false}
        enablePan={false}
        maxDistance={10}
        maxPolarAngle={Math.PI * 0.92}
        minDistance={2.8}
        minPolarAngle={Math.PI * 0.08}
      />
    </Canvas>
  );
}
