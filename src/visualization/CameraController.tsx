import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { TimelineEntry } from './MountainScene';

interface CameraControllerProps {
  timeline: TimelineEntry[];
  activeIndex: number;
  isPlaying: boolean;
  onStepAutoAdvance: (nextIndex: number) => void;
}

const lerpTarget = new Vector3();

/** Distance below which we consider the camera "at" the timeline step. */
const ARRIVAL_THRESHOLD = 0.05;

/** Seconds per step when playing (time-based advance; camera is not moved). */
const PLAYBACK_SECONDS_PER_STEP = 2;

/**
 * Imperative camera controller that lerps the camera towards the current
 * timeline step only when the user selects a step (e.g. clicks the timeline).
 * During playback we advance the step index but do not move the camera, so
 * your current view is preserved.
 */
export const CameraController: React.FC<CameraControllerProps> = ({
  timeline,
  activeIndex,
  isPlaying,
  onStepAutoAdvance,
}) => {
  const { camera } = useThree();
  const lastIndexRef = useRef(activeIndex);
  const playbackElapsedRef = useRef(0);
  /** True only after user selected a step; we animate there then release. Never set during playback. */
  const animatingToStepRef = useRef(true);

  useEffect(() => {
    lastIndexRef.current = activeIndex;
    playbackElapsedRef.current = 0;
    // Only drive camera to the new step when user selected it (e.g. clicked timeline), not when playback advanced
    if (!isPlaying) animatingToStepRef.current = true;
  }, [activeIndex, isPlaying]);

  useFrame((_, delta) => {
    const current = timeline[activeIndex];
    if (!current) return;

    const [x, y, z] = current.position;
    lerpTarget.set(x + 1.6, y + 1.2, z + 1.6);

    if (animatingToStepRef.current) {
      camera.position.lerp(lerpTarget, 0.04);
      camera.lookAt(x, y + 0.3, z);
      const distance = camera.position.distanceTo(lerpTarget);
      if (distance < ARRIVAL_THRESHOLD) animatingToStepRef.current = false;
    }

    if (isPlaying) {
      playbackElapsedRef.current += delta;
      if (playbackElapsedRef.current >= PLAYBACK_SECONDS_PER_STEP) {
        playbackElapsedRef.current = 0;
        const nextIndex = lastIndexRef.current + 1;
        if (nextIndex < timeline.length) {
          onStepAutoAdvance(nextIndex);
          lastIndexRef.current = nextIndex;
        }
      }
    }
  });

  return null;
};

