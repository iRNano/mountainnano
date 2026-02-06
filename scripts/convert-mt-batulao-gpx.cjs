// Simple GPX -> JSON converter for Mt. Batulao.
// - Input:  src/data/mt-batulao/mt-batulao.gpx
// - Output:
//     - src/data/mt-batulao/trail.json
//     - src/data/mt-batulao/timeline.json
//     - src/data/mt-batulao/terrain.json (heightfield sampled from GPX)
//
// The goal is to:
// - Normalize real-world lat/lon/elevation into a small local coordinate system
//   suitable for the existing Three.js scene.
// - Keep the JSON lightweight by subsampling points.

const fs = require('node:fs');
const path = require('node:path');
const { parseStringPromise } = require('xml2js');

const GPX_PATH = path.join(__dirname, '..', 'src', 'data', 'mt-batulao', 'mt-batulao.gpx');
const TRAIL_JSON_PATH = path.join(__dirname, '..', 'src', 'data', 'mt-batulao', 'trail.json');
const TIMELINE_JSON_PATH = path.join(__dirname, '..', 'src', 'data', 'mt-batulao', 'timeline.json');
const TERRAIN_JSON_PATH = path.join(__dirname, '..', 'src', 'data', 'mt-batulao', 'terrain.json');
const POIS_DEF_PATH = path.join(__dirname, '..', 'src', 'data', 'mt-batulao', 'pois.json');

async function loadGpx() {
  const raw = fs.readFileSync(GPX_PATH, 'utf8');
  const xml = await parseStringPromise(raw);

  const trk = xml?.gpx?.trk?.[0];
  const seg = trk?.trkseg?.[0];
  const pts = seg?.trkpt;

  if (!Array.isArray(pts) || pts.length === 0) {
    throw new Error('No <trkpt> points found in GPX file.');
  }

  // Extract basic numeric data
  const rawPoints = pts.map((pt) => {
    const lat = parseFloat(pt.$.lat);
    const lon = parseFloat(pt.$.lon);
    const ele = pt.ele?.[0] ? parseFloat(pt.ele[0]) : 0;
    const timeStr = pt.time?.[0];
    const timeMs = timeStr ? Date.parse(timeStr) : Number.NaN;
    return { lat, lon, ele, timeMs };
  });

  return rawPoints;
}

function normalizePoints(rawPoints) {
  const lats = rawPoints.map((p) => p.lat);
  const lons = rawPoints.map((p) => p.lon);
  const eles = rawPoints.map((p) => p.ele);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minEle = Math.min(...eles);
  const maxEle = Math.max(...eles);

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  const spanLat = maxLat - minLat || 1;
  const spanLon = maxLon - minLon || 1;
  const maxSpan = Math.max(spanLat, spanLon);

  // Map the horizontal extent roughly into [-2, 2] in local space.
  const horizontalScale = 4 / maxSpan;

  const eleSpan = maxEle - minEle || 1;
  // Compress elevation into a gentle 0..0.8 range.
  const elevationScale = 0.8 / eleSpan;

  // Flip east–west (x) so local layout matches real-world orientation (e.g. Komoot).
  const normalized = rawPoints.map((p) => {
    const x = -(p.lon - centerLon) * horizontalScale;
    const z = (p.lat - centerLat) * horizontalScale;
    const y = (p.ele - minEle) * elevationScale;
    return [x, y, z];
  });

  return {
    points: normalized,
    times: rawPoints.map((p) => p.timeMs),
    bbox: {
      minLat,
      maxLat,
      minLon,
      maxLon,
      minEle,
      maxEle,
    },
  };
}

function formatElapsedLabel(totalSeconds) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildTimeline(points, times) {
  // Build timeline from POI definitions snapped to the trail.
  const poiDefs = JSON.parse(fs.readFileSync(POIS_DEF_PATH, 'utf8'));
  const timeline = [];

  // Precompute overall time range for fraction-by-time lookups.
  const finiteTimes = times.filter((t) => Number.isFinite(t));
  const startTime = finiteTimes.length ? Math.min(...finiteTimes) : Number.NaN;
  const endTime = finiteTimes.length ? Math.max(...finiteTimes) : Number.NaN;
  const totalDurationMs = Number.isFinite(startTime) && Number.isFinite(endTime)
    ? endTime - startTime
    : 0;

  poiDefs.forEach((poi, index) => {
    let idx = 0;

    // Preferred: derive position from elapsed time along the GPX track
    // if the POI provides elapsedSeconds or elapsedMinutes.
    const hasElapsedSeconds = typeof poi.elapsedSeconds === 'number';
    const hasElapsedMinutes = typeof poi.elapsedMinutes === 'number';

    if ((hasElapsedSeconds || hasElapsedMinutes) && Number.isFinite(startTime) && totalDurationMs > 0) {
      const elapsedSeconds = hasElapsedSeconds
        ? poi.elapsedSeconds
        : poi.elapsedMinutes * 60;
      const targetTimeMs = startTime + elapsedSeconds * 1000;

      let bestIdx = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < times.length; i += 1) {
        const t = times[i];
        if (!Number.isFinite(t)) continue;
        const diff = Math.abs(t - targetTimeMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      idx = bestIdx;
    } else {
      // Fallback: use a fraction along the trail (existing behaviour).
      const fraction =
        typeof poi.fraction === 'number'
          ? Math.min(1, Math.max(0, poi.fraction))
          : index / Math.max(1, poiDefs.length - 1);

      idx = Math.floor(fraction * (points.length - 1));
    }

    idx = Math.max(0, Math.min(points.length - 1, idx));

    const [x, y, z] = points[idx];

    // Time label for the UI: prefer explicit poi.time, then elapsed time, then legacy 10s steps.
    let labelTime;
    if (typeof poi.time === 'string') {
      labelTime = poi.time;
    } else if (hasElapsedSeconds || hasElapsedMinutes) {
      const elapsedSeconds = hasElapsedSeconds
        ? poi.elapsedSeconds
        : poi.elapsedMinutes * 60;
      labelTime = formatElapsedLabel(elapsedSeconds);
    } else {
      labelTime = `00:${String(index * 10).padStart(2, '0')}`;
    }

    timeline.push({
      time: labelTime,
      label: poi.name,
      position: [x, y, z],
    });
  });

  return timeline;
}

function buildHeightfield(points, bbox) {
  // Build a simple local heightfield by "inflating" the GPX trail elevations
  // into a ridge that falls off smoothly from the track line.
  const resolution = 64;
  const size = 8; // matches the plane size in the Three.js scene
  const halfSize = size / 2;

  const heights = [];

  // Precompute once to avoid repeated Math.sqrt for thresholding
  const sigma = 1.2;
  const twoSigmaSq = 2 * sigma * sigma;

  for (let j = 0; j < resolution; j += 1) {
    const row = [];
    const v = (j / (resolution - 1)) * size - halfSize; // z coordinate

    for (let i = 0; i < resolution; i += 1) {
      const u = (i / (resolution - 1)) * size - halfSize; // x coordinate

      let nearestY = 0;
      let minDistSq = Infinity;

      // Find nearest point on the normalized trail in the XZ plane.
      for (let k = 0; k < points.length; k += 1) {
        const [tx, ty, tz] = points[k];
        const dx = u - tx;
        const dz = v - tz;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDistSq) {
          minDistSq = distSq;
          nearestY = ty;
        }
      }

      const falloff = Math.exp(-minDistSq / twoSigmaSq);
      const height = nearestY * falloff;
      row.push(height);
    }

    heights.push(row);
  }

  return {
    name: 'Mt. Batulao Heightfield',
    source: 'mt-batulao.gpx',
    coordinateSystem: 'local-cartesian',
    size,
    resolution,
    bbox,
    heights,
  };
}

async function main() {
  console.log('Reading GPX from', GPX_PATH);
  const rawPoints = await loadGpx();

  // Downsample for a lighter JSON file (keep every Nth point).
  const step = Math.max(1, Math.floor(rawPoints.length / 500)); // aim for ~500 points max
  const sampled = rawPoints.filter((_, i) => i % step === 0);

  const { points, bbox, times } = normalizePoints(sampled);

  const trailPayload = {
    name: 'Mt. Batulao Summit Trail',
    source: 'mt-batulao.gpx',
    coordinateSystem: 'local-cartesian',
    bbox,
    points,
  };

  const timelinePayload = buildTimeline(points, times);
  const terrainPayload = buildHeightfield(points, bbox);

  fs.writeFileSync(TRAIL_JSON_PATH, JSON.stringify(trailPayload, null, 2));
  fs.writeFileSync(TIMELINE_JSON_PATH, JSON.stringify(timelinePayload, null, 2));
  fs.writeFileSync(TERRAIN_JSON_PATH, JSON.stringify(terrainPayload, null, 2));

  console.log(`Wrote trail JSON to ${TRAIL_JSON_PATH}`);
  console.log(`Wrote timeline JSON to ${TIMELINE_JSON_PATH}`);
  console.log(`Wrote terrain JSON to ${TERRAIN_JSON_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

