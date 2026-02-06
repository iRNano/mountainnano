import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { TrailPath, type TrailPoint } from './TrailPath';
import { CameraController, PLAYBACK_SECONDS_PER_STEP } from './CameraController';
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

// Mapbox configuration for terrain imagery
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as
  | string
  | undefined;
const MAPBOX_STYLE_ID = 'mapbox/satellite-v9';
const MAPBOX_IMAGE_URL = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE_ID}/static/[${typedTerrain.bbox.minLon},${typedTerrain.bbox.minLat},${typedTerrain.bbox.maxLon},${typedTerrain.bbox.maxLat}]/1024x1024@2x?access_token=${MAPBOX_TOKEN}`
  : undefined;

/** Find trail point index closest to a given position (for mapping waypoints to trail). */
function closestTrailIndex(points: TrailPoint[], pos: [number, number, number]): number {
  let best = 0;
  let bestD2 = Infinity;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const d2 =
      (p[0] - pos[0]) ** 2 + (p[1] - pos[1]) ** 2 + (p[2] - pos[2]) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = i;
    }
  }
  return best;
}

/** Linear interpolation along the trail: fraction 0 = start, 1 = end. */
function positionOnTrail(
  points: TrailPoint[],
  fraction: number
): [number, number, number] {
  if (points.length === 0) return [0, 0, 0];
  if (points.length === 1) return [...points[0]];
  const n = points.length - 1;
  const i = Math.max(0, Math.min(fraction * n, n));
  const i0 = Math.floor(i);
  const i1 = Math.min(i0 + 1, n);
  const t = i - i0;
  const a = points[i0];
  const b = points[i1];
  return [
    a[0] + t * (b[0] - a[0]),
    a[1] + t * (b[1] - a[1]),
    a[2] + t * (b[2] - a[2]),
  ];
}

const TerrainHeightfield: React.FC = () => {
  const terrainRef = useRef<THREE.Mesh | null>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

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

  // Load Mapbox imagery as a texture and drape it over the heightfield.
  useEffect(() => {
    if (!MAPBOX_IMAGE_URL) return;
    const loader = new THREE.TextureLoader();
    loader.load(
      MAPBOX_IMAGE_URL,
      (tex) => {
        tex.anisotropy = 8;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        setTexture(tex);
      },
      undefined,
      (err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load Mapbox terrain texture', err);
      }
    );
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
      {texture ? (
        // Use a basic material when the Mapbox texture is present so the imagery
        // is not washed out by lighting. This makes the texture change obvious.
        <meshBasicMaterial map={texture} />
      ) : (
        <meshStandardMaterial color="#c8e6c9" wireframe={false} />
      )}
    </mesh>
  );
};

interface TrailRunnerProps {
  trailPoints: TrailPoint[];
  timeline: TimelineEntry[];
  activeIndex: number;
  isPlaying: boolean;
}

/** Object that moves smoothly along the trail during playback instead of jumping waypoints. */
const TrailRunner: React.FC<TrailRunnerProps> = ({
  trailPoints,
  timeline,
  activeIndex,
  isPlaying,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const playbackElapsedRef = useRef(0);

  const stepToTrailFraction = useMemo(() => {
    if (trailPoints.length <= 1) return timeline.map(() => 0);
    const n = trailPoints.length - 1;
    return timeline.map((entry) =>
      Math.min(1, Math.max(0, closestTrailIndex(trailPoints, entry.position) / n))
    );
  }, [trailPoints, timeline]);

  useEffect(() => {
    playbackElapsedRef.current = 0;
  }, [activeIndex]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const fracStart = stepToTrailFraction[activeIndex] ?? 0;
    const fracEnd =
      stepToTrailFraction[Math.min(activeIndex + 1, timeline.length - 1)] ??
      fracStart;
    let trailFrac: number;
    if (isPlaying) {
      playbackElapsedRef.current += delta;
      const subProgress = Math.min(
        1,
        playbackElapsedRef.current / PLAYBACK_SECONDS_PER_STEP
      );
      trailFrac = fracStart + subProgress * (fracEnd - fracStart);
    } else {
      trailFrac = fracStart;
    }
    const [x, y, z] = positionOnTrail(trailPoints, trailFrac);
    mesh.position.set(x, y + 0.02, z);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial color="#1565c0" />
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

      {/* Object that travels smoothly along the trail during playback */}
      <TrailRunner
        trailPoints={typedTrailPoints}
        timeline={timeline}
        activeIndex={activeIndex}
        isPlaying={isPlaying}
      />

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
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
        minDistance={3}
        maxDistance={15}
      />
    </Canvas>
  );
};

