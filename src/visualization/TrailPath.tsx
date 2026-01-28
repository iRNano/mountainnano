import React, { useMemo, useState } from 'react';
import { Line } from '@react-three/drei';
import type { Vector3 } from 'three';

export type TrailPoint = [number, number, number];

interface TrailPathProps {
  points: TrailPoint[];
}

/**
 * Simple line-based trail visualization.
 * Slightly offsets the Y component to avoid z-fighting with the terrain mesh.
 */
export const TrailPath: React.FC<TrailPathProps> = ({ points }) => {
  const [hovered, setHovered] = useState(false);

  const linePoints = useMemo(
    () =>
      points.map(
        ([x, y, z]) => [x, y + 0.02, z] as unknown as Vector3 // small lift above terrain
      ),
    [points]
  );

  return (
    <Line
      points={linePoints}
      color={hovered ? '#ffb300' : '#ff6f00'}
      lineWidth={hovered ? 4 : 3}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    />
  );
};

