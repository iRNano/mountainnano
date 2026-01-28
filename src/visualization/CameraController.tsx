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

/**
 * Imperative camera controller that lerps the camera towards the current
 * timeline step position. During playback, it automatically advances through
 * the timeline when it reaches each step.
 *
 * The math is intentionally simple and commented for clarity over cleverness.
 */
export const CameraController: React.FC<CameraControllerProps> = ({
  timeline,
  activeIndex,
  isPlaying,
  onStepAutoAdvance,
}) => {
  const { camera } = useThree();
  const lastIndexRef = useRef(activeIndex);

  useEffect(() => {
    lastIndexRef.current = activeIndex;
  }, [activeIndex]);

  useFrame(() => {
    const current = timeline[activeIndex];
    if (!current) return;

    const [x, y, z] = current.position;

    // Compute the target camera position slightly above and back from the point
    // to give a bit of top-down perspective.
    lerpTarget.set(x + 1.6, y + 1.2, z + 1.6);

    // Smoothly move the camera towards the target each frame.
    // Smaller alpha => slower, smoother movement.
    camera.position.lerp(lerpTarget, 0.04);

    // Always look at the current step's position (slightly above ground).
    camera.lookAt(x, y + 0.3, z);

    if (!isPlaying) return;

    // When close enough to the current step, advance to the next one.
    const distance = camera.position.distanceTo(lerpTarget);
    if (distance < 0.05) {
      const currentIndex = lastIndexRef.current;
      const nextIndex = currentIndex + 1;

      if (nextIndex < timeline.length) {
        onStepAutoAdvance(nextIndex);
        lastIndexRef.current = nextIndex;
      }
    }
  });

  return null;
};

