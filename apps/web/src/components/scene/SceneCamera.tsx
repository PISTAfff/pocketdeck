'use client';

/**
 * SceneCamera, drives the active camera based on the current section and the
 * global scroll progress. Damps position / look-at / FOV toward the per-section
 * keyframe each frame so transitions feel cinematic instead of snappy.
 */
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, type PerspectiveCameraProps } from '@react-three/drei';
import { Vector3, MathUtils, type PerspectiveCamera as ThreePerspectiveCamera } from 'three';
import { useSceneStore } from '@/store/scene';
import { getCameraKeyframe } from '@/lib/scene/keyframes';

// Pre-allocated working vectors, created once, reused every frame.
const targetPos = new Vector3();
const targetLookAt = new Vector3();
const currentLookAt = new Vector3();

const POSITION_LERP = 0.06;
const LOOKAT_LERP = 0.08;
const FOV_LERP = 0.08;

export function SceneCamera(props: PerspectiveCameraProps) {
  const camRef = useRef<ThreePerspectiveCamera>(null);
  const setDefault = useThree((s) => s.set);

  useFrame(() => {
    const cam = camRef.current;
    if (!cam) return;

    const state = useSceneStore.getState();
    const kf = getCameraKeyframe(
      state.activeSection,
      state.highlightPart,
      state.anatomyProgress,
    );

    targetPos.set(kf.position[0], kf.position[1], kf.position[2]);
    targetLookAt.set(kf.target[0], kf.target[1], kf.target[2]);

    // Position
    cam.position.lerp(targetPos, POSITION_LERP);

    // Look-at: damp the look target so the camera doesn't snap.
    // We use the camera's current forward to derive a virtual current look target
    // 5 units ahead, then lerp that toward kf.target.
    cam.getWorldDirection(currentLookAt);
    currentLookAt.multiplyScalar(5).add(cam.position);
    currentLookAt.lerp(targetLookAt, LOOKAT_LERP);
    cam.lookAt(currentLookAt);

    // FOV
    cam.fov = MathUtils.lerp(cam.fov, kf.fov, FOV_LERP);
    cam.updateProjectionMatrix();
  });

  return (
    <PerspectiveCamera
      ref={camRef as React.RefObject<ThreePerspectiveCamera>}
      makeDefault
      position={[0, 1.4, 7.2]}
      fov={32}
      near={0.1}
      far={100}
      onUpdate={(cam) => {
        // Make sure r3f sees this as the default camera right away.
        setDefault({ camera: cam });
      }}
      {...props}
    />
  );
}
