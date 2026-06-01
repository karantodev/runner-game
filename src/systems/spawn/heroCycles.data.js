/**
 * v4.2 — P2 reference-match: Hero-cycle variety. Three cycle templates that
 * all share HERO_ROAD_CYCLE_LENGTH (105) as their total length so the overall
 * gameplay cadence is preserved. SpawnSystem rotates through them by index so
 * the player never memorises one fixed 105-unit sequence.
 *
 * Template A  — original HERO_ROAD_SEQUENCE (left-lane jump, center vine).
 * Template B  — right-shifted variant (right-lane jump, mid vine, alternate
 *               flower arc directions) so the player must vary their lane.
 * Template C  — duck beat (overhang) variant. One overhang + a vine later,
 *               with reward clusters at both exits.
 */

import { HERO_ROAD_SEQUENCE, HERO_ROAD_CYCLE_LENGTH } from '../../config/sceneSchema.data.js';

// v4.2 — P2 reference-match: Template B — jump shifted to lane +1, vine entry
// approach in right lane, flower arc reversed (right → left), zigzag mirrored.
const HERO_CYCLE_B = Object.freeze([
  // Opening flower line: right lane (vs center in A) to guide player right.
  { offsetInCycle:  4, kind: 'flower-line',  lane: 1, count: 3, spacing: 8 },
  // Arc sweeps right → left (reverse of A which goes left → right).
  { offsetInCycle: 28, kind: 'flower-arc',   fromLane: 1, toLane: -1, count: 4 },
  // Jump obstacle at lane +1 (vs -1 in A), reward cluster in center after.
  { offsetInCycle: 36, kind: 'jump-obstacle', lane: 1 },
  { offsetInCycle: 46, kind: 'reward-cluster', lane: 0, count: 4 },
  // Vine beat at same 60-unit mark but reward approach cued by the vine itself.
  { offsetInCycle: 60, kind: 'vine-with-rewards', lane: 0 },
  // Zigzag mirrored vs A: starts on left side.
  { offsetInCycle: 80, kind: 'flower-zigzag', lanes: [-1, 0, 1, 0, -1] },
  { offsetInCycle: 96, kind: 'reward-cluster', lane: 0, count: 4 },
]);

// v4.2 — P2 reference-match: Template C — duck beat variant. Overhang (all
// lanes) at offset 30 forces the player to crouch; a vine follows at offset
// 90 once the crouch lock-out has expired even at maximum speed burst.
// Total length stays 105.
const HERO_CYCLE_C = Object.freeze([
  // Opener: guiding left-lane line.
  { offsetInCycle:  4, kind: 'flower-line',  lane: -1, count: 3, spacing: 8 },
  // A small reward arc approaching the overhang so the duck cue is rewarded.
  { offsetInCycle: 16, kind: 'flower-arc',   fromLane: -1, toLane: 1, count: 3 },
  // Overhang (allLanes) — player must duck. Crouch lock-out ≈ 24 units, so
  // next hazard at offset 90 gives enough clear ground even during burst.
  { offsetInCycle: 30, kind: 'overhang-duck' },
  // Reward cluster after the duck exit (offset 52: 22 units after overhang).
  { offsetInCycle: 52, kind: 'reward-cluster', lane: 0, count: 3 },
  // Vine at offset 90: 60 units after the overhang. At maximum burst the
  // 14-frame crouch dwell consumes ~56 units, leaving a readable jump cue.
  { offsetInCycle: 90, kind: 'vine-with-rewards', lane: 0 },
  // Final zigzag + cluster as reward trail.
  { offsetInCycle: 82, kind: 'flower-zigzag', lanes: [1, 0, -1] },
  { offsetInCycle: 96, kind: 'reward-cluster', lane: 0, count: 4 },
]);

/**
 * HERO_ROAD_CYCLES — array of 3 templates.
 * SpawnSystem selects template at `cycleIndex % HERO_ROAD_CYCLES.length`.
 *
 * Element 0 — Template A: original HERO_ROAD_SEQUENCE (left-lane jump).
 * Element 1 — Template B: right-lane jump, reversed arcs.
 * Element 2 — Template C: overhang duck + vine combo.
 *
 * All templates cover exactly HERO_ROAD_CYCLE_LENGTH (105) distance units.
 */
export const HERO_ROAD_CYCLES = Object.freeze([
  HERO_ROAD_SEQUENCE, // Template A — preserves original rhythm verbatim
  HERO_CYCLE_B,
  HERO_CYCLE_C,
]);

// Re-export for convenience so callers can import from one place.
export { HERO_ROAD_CYCLE_LENGTH };
