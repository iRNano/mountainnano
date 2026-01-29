import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { TrailPath, type TrailPoint } from './TrailPath';
import { CameraController } from './CameraController';
import * as THREE from 'three';
import trailData from '../data/mt-batulao/trail.json';
import timelineData from '../data/mt-batulao/timeline.json';
import terrainData from '../data/mt-batulao/terrain.json';

export interface TimelineEntry {
  time: string;
  label: string;
  position: [number, number, number];
}

interface MountainSceneProps {
  activeIndex: number;
  isPlaying: boolean;
  onStepAutoAdvance: (nextIndex: number) => void;
}

type TrailJson = {
  name: string;
  source: string;
  coordinateSystem: string;
  bbox: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    minEle: number;
    maxEle: number;
  };
  points: number[][];
};

type TerrainJson = {
  name: string;
  source: string;
  coordinateSystem: string;
  size: number;
  resolution: number;
  bbox: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
    minEle: number;
    maxEle: number;
  };
  heights: number[][];
};

const typedTrailPoints = (trailData as TrailJson).points as TrailPoint[];
const typedTimeline = timelineData as TimelineEntry[];
const typedTerrain = terrainData as TerrainJson;

const TerrainHeightfield: React.FC = () => {
  const terrainRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const mesh = terrainRef.current;
    if (!mesh) return;

    const geom = mesh.geometry as THREE.PlaneGeometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const res = typedTerrain.resolution;
    const heights = typedTerrain.heights;
    const verticalScale = 1; // DEM exaggeration factor

    if (!heights.length || heights.length !== res) return;

    // Apply DEM-derived heights to the plane
    for (let j = 0; j < res; j += 1) {
      const row = heights[j];
      if (!row || row.length !== res) continue;

      for (let i = 0; i < res; i += 1) {
        const idx = j * res + i;
        if (idx >= pos.count) continue;

        v.fromBufferAttribute(pos, idx);
        const height = row[i] * verticalScale;
        pos.setXYZ(idx, v.x, v.y, height);
      }
    }

    pos.needsUpdate = true;
    geom.computeVertexNormals();
  }, []);

  return (
    <mesh
      ref={terrainRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      castShadow
    >
      <planeGeometry
        args={[
          typedTerrain.size,
          typedTerrain.size,
          typedTerrain.resolution - 1,
          typedTerrain.resolution - 1,
        ]}
      />
      <meshStandardMaterial color="#c8e6c9" wireframe={false} />
    </mesh>
  );
};

const PoiMarkers: React.FC = () => {
  return (
    <>
      {typedTimeline.map((entry, index) => (
        <group key={entry.label} position={entry.position}>
          <mesh>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial
              color={
                index === 0
                  ? '#2e7d32' // start - green
                  : index === typedTimeline.length - 1
                    ? '#d32f2f' // summit - red
                    : '#ffb300' // intermediate POIs
              }
            />
          </mesh>
          <Html
            distanceFactor={12}
            position={[0, 0.2, 0]}
            style={{
              fontSize: '4px',
              padding: '2px 6px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.label}
          </Html>
        </group>
      ))}
    </>
  );
};

/**
 * Top-level 3D scene: terrain + trail + camera controller.
 * Uses a very simple rounded plane as placeholder terrain geometry.
 */
export const MountainScene: React.FC<MountainSceneProps> = ({
  activeIndex,
  isPlaying,
  onStepAutoAdvance,
}) => {
  const timeline = useMemo(() => typedTimeline, []);

  return (
    <Canvas
      camera={{ position: [6, 6, 10], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Lighting */}
      <color attach="background" args={['#e3f2fd']} />
      <ambientLight intensity={0.6} />
      <directionalLight
        intensity={0.9}
        position={[5, 8, 5]}
        castShadow
      />

      {/* Terrain: heightfield (currently synthetic wave for debugging) */}
      <TerrainHeightfield />

      {/* Trail path loaded from trail.json */}
      <TrailPath points={typedTrailPoints} />

      {/* Points of interest derived from timeline entries */}
      <PoiMarkers />

      {/* Camera controller that reacts to the active timeline step */}
      <CameraController
        timeline={timeline}
        activeIndex={activeIndex}
        isPlaying={isPlaying}
        onStepAutoAdvance={onStepAutoAdvance}
      />

      {/* Manual orbit controls for inspection */}
      <OrbitControls
        enableDamping
        dampingFactor={0.15}
        rotateSpeed={0.6}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={3}
        maxDistance={15}
      />
    </Canvas>
  );
};

