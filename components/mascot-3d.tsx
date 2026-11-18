/* eslint-disable react/no-unknown-property -- three.js JSX props (intensity, position, object) */
/**
 * The 3D lamb mascot (generated with Meshy). Loads the GLB from the API server on demand,
 * plays its animation clips by "mood", and falls back to a static image while loading,
 * on error, or when the system asks to reduce motion.
 */
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Canvas, useFrame, useLoader } from "@/lib/r3f";
import { getApiBaseUrl } from "@/constants/api";

export type MascotMood = "idle" | "wave" | "cheer" | "jump" | "sway";

/** Clip names inside public/models/ovelhinha.glb (Meshy preset actions). */
const CLIP_BY_MOOD: Record<MascotMood, string> = {
  idle: "Idle",
  wave: "Big_Wave_Hello",
  cheer: "Cheer_with_Both_Hands_Up",
  jump: "happy_jump_m",
  sway: "Happy_Sway_Standing",
};

export const MASCOT_MODEL_URL = `${getApiBaseUrl()}/models/ovelhinha.glb`;
const FALLBACK_IMAGE = require("@/assets/images/mascote-ovelhinha.png");

/** Target height of the model in scene units; the camera is framed around it. */
const MODEL_HEIGHT = 2;

function LambModel({
  mood,
  moodKey,
  onTap,
  onLoaded,
}: {
  mood: MascotMood;
  moodKey: number;
  onTap?: () => void;
  onLoaded?: () => void;
}) {
  const gltf = useLoader(GLTFLoader, MASCOT_MODEL_URL);
  useEffect(() => {
    onLoaded?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf]);

  // Normalize size/position once: feet on y=0, centered, MODEL_HEIGHT tall
  const scene = useMemo(() => {
    const root = gltf.scene;
    root.traverse((obj) => {
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh || (obj as THREE.Mesh).isMesh) obj.frustumCulled = false;
    });
    // Meshy rigs put the mesh under an Armature scaled 0.01 (cm), so a plain bounding box
    // is 100x too small. Measure the *skinned* vertices instead.
    const measure = () => {
      root.updateMatrixWorld(true);
      root.traverse((obj) => {
        if ((obj as THREE.SkinnedMesh).isSkinnedMesh) (obj as THREE.SkinnedMesh).skeleton.update();
      });
      return new THREE.Box3().setFromObject(root, true);
    };
    const size = measure().getSize(new THREE.Vector3());
    const scale = size.y > 0 ? MODEL_HEIGHT / size.y : 1;
    root.scale.setScalar(scale);
    const scaledBox = measure();
    const center = scaledBox.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= scaledBox.min.y;
    return root;
  }, [gltf]);

  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const current = useRef<THREE.AnimationAction | null>(null);

  const actions = useMemo(() => {
    const map = new Map<string, THREE.AnimationAction>();
    for (const clip of gltf.animations) map.set(clip.name, mixer.clipAction(clip));
    return map;
  }, [gltf.animations, mixer]);

  const play = (name: string, once: boolean) => {
    const next = actions.get(name) ?? actions.get(CLIP_BY_MOOD.idle);
    if (!next) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.enabled = true;
    if (current.current && current.current !== next) {
      next.crossFadeFrom(current.current, 0.3, false);
    }
    next.play();
    current.current = next;
  };

  // One-shot moods play once, then go back to idle
  useEffect(() => {
    const backToIdle = (event: { action: THREE.AnimationAction }) => {
      if (event.action === current.current && event.action !== actions.get(CLIP_BY_MOOD.idle)) {
        play(CLIP_BY_MOOD.idle, false);
      }
    };
    mixer.addEventListener("finished", backToIdle);
    return () => mixer.removeEventListener("finished", backToIdle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer, actions]);

  useEffect(() => {
    play(CLIP_BY_MOOD[mood], mood !== "idle" && mood !== "sway");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, moodKey, actions]);

  useEffect(() => () => void mixer.stopAllAction(), [mixer]);

  useFrame((_, delta) => mixer.update(Math.min(delta, 0.1)));

  return (
    <primitive
      object={scene}
      onPointerDown={(event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        onTap?.();
      }}
    />
  );
}

/** Any loading/render error shows the static image instead of crashing the screen. */
class MascotErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[mascot-3d] falling back to image:", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Mascot3D({
  mood = "idle",
  moodKey = 0,
  size = 180,
  onTap,
  style,
}: {
  mood?: MascotMood;
  /** Change to replay the same mood (e.g. two cheers in a row). */
  moodKey?: number;
  size?: number;
  onTap?: () => void;
  style?: ViewStyle;
}) {
  const reduced = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const fallback = (
    <Image source={FALLBACK_IMAGE} style={{ width: size, height: size }} resizeMode="contain" />
  );

  if (reduced) return <View style={[{ width: size, height: size }, style]}>{fallback}</View>;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <MascotErrorBoundary fallback={fallback}>
        <Canvas
          camera={{ position: [0, MODEL_HEIGHT * 0.55, 4.2], fov: 32 }}
          onCreated={({ camera }) => camera.lookAt(0, MODEL_HEIGHT * 0.48, 0)}
          style={{ width: size, height: size }}
        >
          <ambientLight intensity={1.4} />
          <directionalLight position={[2, 4, 3]} intensity={1.6} />
          <directionalLight position={[-3, 2, -2]} intensity={0.5} />
          {/* The loader suspends inside the Canvas renderer, so the boundary lives here */}
          <Suspense fallback={null}>
            <LambModel mood={mood} moodKey={moodKey} onTap={onTap} onLoaded={() => setLoaded(true)} />
          </Suspense>
        </Canvas>
        {!loaded && <View style={{ position: "absolute", top: 0, left: 0 }}>{fallback}</View>}
      </MascotErrorBoundary>
    </View>
  );
}
