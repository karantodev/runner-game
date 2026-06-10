/**
 * Spawn pattern library — pure data, no logic.
 *
 * Pattern item offset system:
 *   offset 0  = first thing the player encounters (spawned at projection.maxDistance)
 *   offset N  = encountered N world units later (spawned at maxDistance + N)
 *
 * Each pattern must satisfy PathValidator rules:
 *   - No simultaneous 3-lane ground block (window = 13 units)
 *   - No ground obstacle within 36 units after a vine
 *   - Overhangs (overhead barriers) require the player to crouch; they cannot
 *     be jumped over and the duck lock-out runs for ~24 world units, so any
 *     vine that follows an overhang must sit at least 25 units later.
 *
 * difficulty: 0 is reserved for four named specials that are never drawn
 * from the random pool — they are fetched by name via PatternLibrary:
 *   split-bonus-flowers     — wide flower bonus during split-clones power-up
 *   safe-fallback           — fallback when the validator rejects all candidates
 *   special-life-pickup-safe — telegraphed life (heart) pickup sequence
 *   special-powerup-intro   — telegraphed power-up intro sequence
 *
 * Schema:
 *   {
 *     id: string,               // unique, kebab-case
 *     difficulty: 1|2|3|4|5|0,  // 0 = special (see above)
 *     weight?: number,          // pick weight inside its difficulty pool (default 1)
 *     items: [
 *       { kind: 'obstacle', type: string, lane?: number,
 *         assetType?: string, variant?: any, allLanes?: boolean, offset: number }
 *       | { kind: 'flower', lane: number, high?: boolean, offset: number,
 *           collectible?: string }
 *         // collectible reserved tokens (handled specially by SpawnSystem):
 *         //   'life'         → spawns the heart_full collectible
 *         //   'powerup-roll' → SpawnSystem draws a weighted power-up type at
 *         //                    spawn time via the seeded RNG (config table)
 *         //   anything else  → passed through as the collectible type directly
 *     ],
 *   }
 */

export const PATTERNS = Object.freeze([

  // ── Difficulty 1: tutorial — learn to move and jump ─────────────────────────

  {
    id: 'd1-open-field',
    difficulty: 1,
    weight: 2,
    items: [
      { kind: 'flower', lane: 0,  offset: 0  },
      { kind: 'flower', lane: -1, offset: 0  },
      { kind: 'flower', lane: 1,  offset: 0  },
      { kind: 'flower', lane: 0,  offset: 9  },
      { kind: 'flower', lane: -1, offset: 18 },
      { kind: 'flower', lane: 1,  offset: 18 },
    ],
  },

  {
    // Obstacle left — guide flowers in center/right arrive first.
    // v4.2 — P2 reference-match: telegraph flowers in the hazard lane
    // (-1) at offsets 6 and 13 so the player sees the danger lane lit
    // up before the mushroom becomes visible.
    id: 'd1-left-block',
    difficulty: 1,
    weight: 3,
    items: [
      { kind: 'flower', lane: 0,  offset: 0  },
      { kind: 'flower', lane: 1,  offset: 0  },
      // Telegraph: two flowers in the hazard lane ahead of the mushroom.
      { kind: 'flower', lane: -1, offset: 6  },
      { kind: 'flower', lane: -1, offset: 13 },
      { kind: 'obstacle', lane: -1, type: 'mushroom', variant: 'red', offset: 22 },
      { kind: 'flower', lane: 0,  offset: 36 },
      { kind: 'flower', lane: 1,  offset: 44 },
    ],
  },

  {
    // Mirror: obstacle right.
    // v4.2 — P2 reference-match: telegraph flowers in hazard lane (+1)
    // before the wheat so the player sees the lane marked before jumping.
    id: 'd1-right-block',
    difficulty: 1,
    weight: 3,
    items: [
      { kind: 'flower', lane: 0,  offset: 0  },
      { kind: 'flower', lane: -1, offset: 0  },
      // Telegraph: two flowers in the hazard lane ahead of the wheat.
      { kind: 'flower', lane: 1,  offset: 6  },
      { kind: 'flower', lane: 1,  offset: 13 },
      { kind: 'obstacle', lane: 1, type: 'wheat', offset: 22 },
      { kind: 'flower', lane: 0,  offset: 36 },
      { kind: 'flower', lane: -1, offset: 44 },
    ],
  },

  {
    // v4.2 — P2 reference-match: moved bush from lane 0 → -1 so it is never
    // buried in the center orchid trail. Telegraph flowers guide the player
    // to the safe right lane before the hazard appears.
    id: 'd1-center-block',
    difficulty: 1,
    weight: 2,
    items: [
      { kind: 'flower', lane: 0,  offset: 0  },
      { kind: 'flower', lane: 1,  offset: 0  },
      // Telegraph: two flowers in the hazard lane (-1) ahead of the bush,
      // cueing "here comes something — step off this lane".
      { kind: 'flower', lane: -1, offset: 4  },
      { kind: 'flower', lane: -1, offset: 11 },
      { kind: 'obstacle', lane: -1, type: 'bush', offset: 20 },
      { kind: 'flower', lane: 0,  offset: 34 },
      { kind: 'flower', lane: 1,  offset: 34 },
    ],
  },

  {
    // Vine — first exposure. Wide recovery + triple reward teaches the jump.
    // Flowers pushed to offset 55+ so they don't visually merge with the vine at distance.
    id: 'd1-vine-easy',
    difficulty: 1,
    weight: 2,
    items: [
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 0 },
      { kind: 'flower', lane: -1, offset: 56 },
      { kind: 'flower', lane: 0,  offset: 56 },
      { kind: 'flower', lane: 1,  offset: 56 },
      { kind: 'flower', lane: 0,  offset: 65 },
    ],
  },

  // ── Difficulty 2: developing — path choice and vine timing ──────────────────

  {
    // Both sides blocked simultaneously; 3 center flowers make the safe lane obvious.
    id: 'd2-two-sides-blocked',
    difficulty: 2,
    weight: 2,
    items: [
      { kind: 'flower', lane: 0,  offset: 0  },
      { kind: 'flower', lane: 0,  offset: 8  },
      { kind: 'obstacle', lane: -1, type: 'wall',  offset: 20 },
      { kind: 'obstacle', lane: 1,  type: 'wheat', offset: 24 },
      { kind: 'flower', lane: 0,  offset: 36 },
      { kind: 'flower', lane: 0,  offset: 44 },
      { kind: 'flower', lane: 0,  offset: 52 },
    ],
  },

  {
    // v4.2 — P2 reference-match: moved mushroom from lane 0 → +1 so it is
    // never hidden in the center orchid trail. Telegraph flowers in the
    // hazard lane direct the player left before the obstacle appears.
    id: 'd2-center-block',
    difficulty: 2,
    weight: 2,
    items: [
      { kind: 'flower', lane: -1, offset: 0  },
      { kind: 'flower', lane: 0,  offset: 0  },
      // Telegraph: two flowers in the hazard lane (+1) ahead of the mushroom.
      { kind: 'flower', lane: 1,  offset: 6  },
      { kind: 'flower', lane: 1,  offset: 13 },
      { kind: 'obstacle', lane: 1, type: 'mushroom', variant: 'red', offset: 22 },
      { kind: 'flower', lane: -1, offset: 36 },
      { kind: 'flower', lane: 0,  offset: 36 },
      { kind: 'flower', lane: -1, offset: 44 },
    ],
  },

  {
    // Vine + single obstacle 52 units later: player lands with 18+ frames to dodge.
    // Flowers at 52+ so they read as post-vine reward, not vine decoration.
    id: 'd2-vine-obstacle',
    difficulty: 2,
    weight: 2,
    items: [
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 0 },
      { kind: 'flower', lane: 0,  offset: 52 },
      { kind: 'flower', lane: 1,  offset: 52 },
      { kind: 'obstacle', lane: -1, type: 'wall', offset: 64 },
      { kind: 'flower', lane: 0,  offset: 78 },
      { kind: 'flower', lane: 1,  offset: 78 },
    ],
  },

  {
    // Two obstacles staggered 14 units apart: player must commit to center early.
    id: 'd2-staggered-pair',
    difficulty: 2,
    weight: 2,
    items: [
      { kind: 'flower', lane: 0,  offset: 0  },
      { kind: 'obstacle', lane: -1, type: 'bush',     offset: 18 },
      { kind: 'obstacle', lane: 1,  type: 'mushroom', variant: 'red', offset: 32 },
      { kind: 'flower', lane: 0,  offset: 46 },
      { kind: 'flower', lane: 0,  offset: 54 },
    ],
  },

  {
    // Right corridor: left and center blocked together, guiding player hard right.
    id: 'd2-right-corridor',
    difficulty: 2,
    weight: 2,
    items: [
      { kind: 'flower', lane: 1,  offset: 0  },
      { kind: 'flower', lane: 1,  offset: 8  },
      { kind: 'obstacle', lane: -1, type: 'wheat', offset: 16 },
      { kind: 'obstacle', lane: 0,  type: 'wall',  offset: 22 },
      { kind: 'flower', lane: 1,  offset: 36 },
      { kind: 'flower', lane: 1,  offset: 44 },
    ],
  },

  {
    // First overhang exposure — wide buffer before/after, teaches the duck.
    // Flowers at 52+ so they read as post-duck reward, not overhang decoration.
    id: 'd2-overhang-easy',
    difficulty: 2,
    weight: 2,
    items: [
      { kind: 'obstacle', type: 'overhang', assetType: 'low_branch_overhang', offset: 0 },
      { kind: 'flower', lane: -1, offset: 52 },
      { kind: 'flower', lane: 0,  offset: 52 },
      { kind: 'flower', lane: 1,  offset: 52 },
      { kind: 'flower', lane: 0,  offset: 62 },
    ],
  },

  // ── Difficulty 3: skilled — reaction, planning, tight vines ─────────────────

  {
    // Two lanes blocked close together; right lane is the solution and gets rewarded.
    id: 'd3-tight-two',
    difficulty: 3,
    weight: 2,
    items: [
      { kind: 'flower', lane: 1,  offset: 0  },
      { kind: 'obstacle', lane: -1, type: 'wall',     offset: 14 },
      { kind: 'obstacle', lane: 0,  type: 'mushroom', variant: 'red', offset: 20 },
      { kind: 'flower', lane: 1,  offset: 34 },
      { kind: 'flower', lane: 1,  offset: 42 },
      { kind: 'flower', lane: 1,  offset: 50 },
    ],
  },

  {
    // Vine + obstacle 42 units later: tight but fair — player has ~12 ground frames.
    id: 'd3-vine-fast',
    difficulty: 3,
    weight: 2,
    items: [
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 0 },
      { kind: 'flower', lane: 0,  offset: 36 },
      { kind: 'obstacle', lane: -1, type: 'wall', offset: 42 },
      { kind: 'flower', lane: 0,  offset: 56 },
      { kind: 'flower', lane: 1,  offset: 56 },
    ],
  },

  {
    // Two-lane block forces player to right lane; flowers reward staying there.
    id: 'd3-left-center-block',
    difficulty: 3,
    weight: 2,
    items: [
      { kind: 'flower', lane: 1,  offset: 0  },
      { kind: 'obstacle', lane: -1, type: 'wall', offset: 0  },
      { kind: 'obstacle', lane: 0,  type: 'bush', offset: 8  },
      { kind: 'flower', lane: 1,  offset: 8  },
      { kind: 'flower', lane: 1,  offset: 16 },
      { kind: 'flower', lane: 1,  offset: 24 },
      { kind: 'flower', lane: 1,  offset: 32 },
    ],
  },

  {
    // Two simultaneous obstacles then a center block 28 units later; no 3-lane lock.
    id: 'd3-sides-then-center',
    difficulty: 3,
    weight: 2,
    items: [
      { kind: 'flower', lane: 0,  offset: 0  },
      { kind: 'obstacle', lane: -1, type: 'mushroom', variant: 'red', offset: 16 },
      { kind: 'obstacle', lane: 1,  type: 'wheat',                    offset: 16 },
      { kind: 'flower', lane: 0,  offset: 30 },
      { kind: 'obstacle', lane: 0, type: 'wall', offset: 44 },
      { kind: 'flower', lane: -1, offset: 58 },
      { kind: 'flower', lane: 1,  offset: 58 },
    ],
  },

  {
    // Vine → overhang combo. Land from the vine (≤34u airborne), then duck.
    // Overhang at 48 → player has been on ground ~14 units → plenty of time
    // to tap crouch.
    id: 'd3-vine-then-overhang',
    difficulty: 3,
    weight: 2,
    items: [
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 0 },
      { kind: 'flower', lane: 0,  offset: 38 },
      { kind: 'obstacle', type: 'overhang', assetType: 'spider_web_overhang', offset: 48 },
      { kind: 'flower', lane: -1, offset: 78 },
      { kind: 'flower', lane: 1,  offset: 78 },
    ],
  },

  {
    // Overhang → vine. Crouch lock-out runs ~24u, vine at 30 — barely
    // enough to stand and jump. Solvable but demands quick recovery.
    id: 'd3-overhang-then-vine',
    difficulty: 3,
    weight: 2,
    items: [
      { kind: 'flower', lane: 0,  offset: 0  },
      { kind: 'obstacle', type: 'overhang', assetType: 'low_branch_overhang', offset: 16 },
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 48 },
      { kind: 'flower', lane: 0,  offset: 84 },
      { kind: 'flower', lane: -1, offset: 84 },
    ],
  },

  // ── Difficulty 4: expert — minimal spacing, three-wave, vine combos ──────────

  {
    // Three staggered single-lane obstacles in sequence; always one safe lane per wave.
    id: 'd4-triple-wave',
    difficulty: 4,
    weight: 2,
    items: [
      { kind: 'obstacle', lane: -1, type: 'wall',     offset: 0  },
      { kind: 'obstacle', lane: 0,  type: 'mushroom', variant: 'red', offset: 18 },
      { kind: 'obstacle', lane: 1,  type: 'wheat',    offset: 34 },
      { kind: 'flower', lane: -1, offset: 48 },
      { kind: 'flower', lane: 0,  offset: 48 },
      { kind: 'flower', lane: 1,  offset: 48 },
    ],
  },

  {
    // Vine then two ground obstacles 36+ units later; right lane holds both flowers.
    id: 'd4-vine-wall-combo',
    difficulty: 4,
    weight: 2,
    items: [
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 0  },
      { kind: 'flower', lane: 1,  offset: 36 },
      { kind: 'obstacle', lane: 0,  type: 'wall', offset: 36 },
      { kind: 'obstacle', lane: -1, type: 'bush', offset: 48 },
      { kind: 'flower', lane: 1,  offset: 62 },
      { kind: 'flower', lane: 1,  offset: 70 },
    ],
  },

  {
    // Alternating two-lane blocks three times; correct lane toggles -1 → +1 → -1.
    // Each wave leaves exactly one safe lane; reward flowers follow the final safe lane.
    id: 'd4-zigzag-gauntlet',
    difficulty: 4,
    weight: 2,
    items: [
      // Wave 1: lanes 0 and +1 blocked → safe: -1
      { kind: 'obstacle', lane: 0,  type: 'wall',     offset: 0  },
      { kind: 'obstacle', lane: 1,  type: 'mushroom', variant: 'red', offset: 0  },
      // Wave 2: lanes -1 and 0 blocked → safe: +1
      { kind: 'obstacle', lane: -1, type: 'wall',     offset: 20 },
      { kind: 'obstacle', lane: 0,  type: 'wheat',    offset: 20 },
      // Wave 3: lanes 0 and +1 blocked → safe: -1
      { kind: 'obstacle', lane: 0,  type: 'wall',     offset: 38 },
      { kind: 'obstacle', lane: 1,  type: 'bush',     offset: 38 },
      // Reward on final safe lane
      { kind: 'flower', lane: -1, offset: 52 },
      { kind: 'flower', lane: -1, offset: 60 },
      { kind: 'flower', lane: -1, offset: 68 },
    ],
  },

  {
    // Vine → overhang → vine. Expert duck-jump-duck-jump rhythm.
    // Spacing: vine(0), land~31, overhang(46), crouch expires ~70, vine(78).
    id: 'd4-vine-overhang-vine',
    difficulty: 4,
    weight: 1,
    items: [
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 0 },
      { kind: 'flower', lane: 0,  offset: 38 },
      { kind: 'obstacle', type: 'overhang', assetType: 'spider_web_overhang', offset: 46 },
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 78 },
      { kind: 'flower', lane: -1, offset: 112 },
      { kind: 'flower', lane: 0,  offset: 112 },
      { kind: 'flower', lane: 1,  offset: 112 },
    ],
  },

  {
    // Overhang followed by single-lane block: duck under, then read the
    // lane block (well after crouch lock-out expires).
    id: 'd4-overhang-then-lane-block',
    difficulty: 4,
    weight: 1,
    items: [
      { kind: 'obstacle', type: 'overhang', assetType: 'low_branch_overhang', offset: 0 },
      { kind: 'flower', lane: 0, offset: 30 },
      { kind: 'obstacle', lane: 0, type: 'wall', offset: 44 },
      { kind: 'flower', lane: -1, offset: 60 },
      { kind: 'flower', lane: 1,  offset: 60 },
      { kind: 'flower', lane: -1, offset: 68 },
    ],
  },

  // ── Difficulty 5: deep run — rolling corridors + optional jackpots ───────────

  {
    // Safe lane rolls -1 → 0 → +1 across three waves. Each wave leaves exactly
    // one open lane, reachable from the previous. Jackpot rewards the final lane.
    id: 'd5-rolling-corridor',
    difficulty: 5,
    weight: 2,
    items: [
      { kind: 'obstacle', lane: 0,  type: 'wall',     offset: 0  },
      { kind: 'obstacle', lane: 1,  type: 'mushroom', variant: 'red', offset: 0  },
      { kind: 'obstacle', lane: -1, type: 'wall',     offset: 22 },
      { kind: 'obstacle', lane: 1,  type: 'wheat',    offset: 22 },
      { kind: 'obstacle', lane: -1, type: 'bush',     offset: 44 },
      { kind: 'obstacle', lane: 0,  type: 'wall',     offset: 44 },
      { kind: 'flower', lane: 1, offset: 58 },
      { kind: 'flower', collectible: 'flower-rich', lane: 1, high: true, offset: 66 },
    ],
  },

  {
    // Vine jump into a single-lane weave; jackpot sits on the clear exit lane.
    id: 'd5-vine-weave',
    difficulty: 5,
    weight: 2,
    items: [
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 0 },
      { kind: 'flower', lane: 0, offset: 40 },
      { kind: 'obstacle', lane: -1, type: 'wall',     offset: 48 },
      { kind: 'obstacle', lane: 1,  type: 'mushroom', variant: 'red', offset: 64 },
      { kind: 'flower', lane: 0, offset: 80 },
      { kind: 'flower', collectible: 'flower-rich', lane: 0, high: true, offset: 90 },
    ],
  },

  {
    // Duck then a rolling two-lane corridor. Overhang→vine spacing kept wide.
    id: 'd5-duck-corridor',
    difficulty: 5,
    weight: 1,
    items: [
      { kind: 'obstacle', type: 'overhang', assetType: 'low_branch_overhang', offset: 0 },
      { kind: 'flower', lane: 0, offset: 30 },
      { kind: 'obstacle', lane: 0,  type: 'wall', offset: 44 },
      { kind: 'obstacle', lane: 1,  type: 'bush', offset: 62 },
      { kind: 'flower', lane: -1, offset: 78 },
      { kind: 'flower', collectible: 'flower-rich', lane: -1, high: true, offset: 88 },
    ],
  },

  {
    // Three single-lane hazards stepping +1 → 0 → -1; one safe lane per wave,
    // then a jackpot rewards committing to the right lane.
    id: 'd5-snap-turn',
    difficulty: 5,
    weight: 2,
    items: [
      { kind: 'flower', lane: 0, offset: 0 },
      { kind: 'obstacle', lane: 1,  type: 'mushroom', variant: 'red', offset: 16 },
      { kind: 'obstacle', lane: 0,  type: 'wall',     offset: 34 },
      { kind: 'obstacle', lane: -1, type: 'bush',     offset: 52 },
      { kind: 'flower', lane: 1, offset: 66 },
      { kind: 'flower', collectible: 'flower-rich', lane: 1, high: true, offset: 74 },
    ],
  },

  {
    // Vine jump into a two-lane gate (safe lane +1), then a single block off
    // that lane — land, commit, then peel away.
    id: 'd5-vine-gate',
    difficulty: 5,
    weight: 2,
    items: [
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 0 },
      { kind: 'flower', lane: 0, offset: 40 },
      { kind: 'obstacle', lane: -1, type: 'wall',  offset: 48 },
      { kind: 'obstacle', lane: 0,  type: 'wheat', offset: 48 },
      { kind: 'flower', lane: 1, offset: 62 },
      { kind: 'obstacle', lane: 1,  type: 'bush',  offset: 76 },
      { kind: 'flower', lane: 0, offset: 92 },
    ],
  },

  {
    // Duck the overhang, then a single-lane weave with a jackpot on the exit.
    id: 'd5-duck-weave',
    difficulty: 5,
    weight: 1,
    items: [
      { kind: 'obstacle', type: 'overhang', assetType: 'spider_web_overhang', offset: 0 },
      { kind: 'flower', lane: 1, offset: 30 },
      { kind: 'obstacle', lane: 1,  type: 'mushroom', variant: 'red', offset: 44 },
      { kind: 'obstacle', lane: -1, type: 'wall',     offset: 60 },
      { kind: 'flower', lane: 0, offset: 76 },
      { kind: 'flower', collectible: 'flower-rich', lane: 0, high: true, offset: 86 },
    ],
  },

  // ── Difficulty 6: end-game — maximum fair pressure for very long runs ────────

  {
    // Four-wave rolling gauntlet (one wave more than d4); the safe lane swings
    // -1 → +1 → -1 → +1, each shift exactly inside the 18-unit window.
    id: 'd6-rolling-gauntlet',
    difficulty: 6,
    weight: 2,
    items: [
      { kind: 'obstacle', lane: 0,  type: 'wall',     offset: 0  },
      { kind: 'obstacle', lane: 1,  type: 'mushroom', variant: 'red', offset: 0  },
      { kind: 'obstacle', lane: -1, type: 'wall',     offset: 18 },
      { kind: 'obstacle', lane: 0,  type: 'wheat',    offset: 18 },
      { kind: 'obstacle', lane: 0,  type: 'wall',     offset: 36 },
      { kind: 'obstacle', lane: 1,  type: 'bush',     offset: 36 },
      { kind: 'obstacle', lane: -1, type: 'wall',     offset: 54 },
      { kind: 'obstacle', lane: 0,  type: 'mushroom', variant: 'red', offset: 54 },
      { kind: 'flower', lane: 1, offset: 68 },
      { kind: 'flower', collectible: 'flower-rich', lane: 1, high: true, offset: 76 },
    ],
  },

  {
    // Duck → jump → duck rhythm (overhang, vine, overhang) with proven spacing,
    // then a jackpot once the final crouch lock-out clears.
    id: 'd6-duck-jump-duck',
    difficulty: 6,
    weight: 1,
    items: [
      { kind: 'obstacle', type: 'overhang', assetType: 'low_branch_overhang', offset: 0 },
      { kind: 'flower', lane: 0, offset: 30 },
      { kind: 'obstacle', allLanes: true, type: 'vine', offset: 44 },
      { kind: 'flower', lane: 0, offset: 74 },
      { kind: 'obstacle', type: 'overhang', assetType: 'spider_web_overhang', offset: 82 },
      { kind: 'flower', lane: -1, offset: 108 },
      { kind: 'flower', collectible: 'flower-rich', lane: 0, high: true, offset: 116 },
    ],
  },

  {
    // Four single-lane snaps stepping +1 → 0 → -1 → +1, each a one-lane move in
    // the 16-unit gap; a jackpot rewards holding the final safe lane.
    id: 'd6-quad-snap',
    difficulty: 6,
    weight: 2,
    items: [
      { kind: 'obstacle', lane: 1,  type: 'mushroom', variant: 'red', offset: 0  },
      { kind: 'obstacle', lane: 0,  type: 'wall',     offset: 16 },
      { kind: 'obstacle', lane: -1, type: 'bush',     offset: 32 },
      { kind: 'obstacle', lane: 1,  type: 'wheat',    offset: 48 },
      { kind: 'flower', lane: 0, offset: 62 },
      { kind: 'flower', collectible: 'flower-rich', lane: 0, high: true, offset: 70 },
    ],
  },
]);

// Spawned during split-clones power-up: no obstacles, wide flower bonus.
export const SPLIT_BONUS = Object.freeze({
  id: 'split-bonus-flowers',
  difficulty: 0,
  items: [
    { kind: 'flower', lane: -1, offset: 0  },
    { kind: 'flower', lane: 0,  offset: 0  },
    { kind: 'flower', lane: 1,  offset: 0  },
    { kind: 'flower', lane: -1, offset: 9  },
    { kind: 'flower', lane: 0,  offset: 9  },
    { kind: 'flower', lane: 1,  offset: 9  },
    { kind: 'flower', lane: 0,  offset: 18 },
  ],
});

// Unconditionally safe fallback if the validator rejects every candidate.
export const SAFE_FALLBACK = Object.freeze({
  id: 'safe-fallback',
  difficulty: 0,
  items: [
    { kind: 'flower', lane: 0,  offset: 0 },
    { kind: 'flower', lane: -1, offset: 0 },
    { kind: 'flower', lane: 1,  offset: 0 },
  ],
});

// ── Pickup specials (difficulty 0 — routed through #tickLife / #tickPowerUp) ──
//
// These follow the SPLIT_BONUS / SAFE_FALLBACK precedent: hand-authored,
// exported by name, fetched via PatternLibrary.pickLifePickup() /
// PatternLibrary.pickPowerUpIntro(), never mixed into the random pool.
//
// 'collectible' field on flower items:
//   'life'         → resolves to the heart_full collectible via #spawnPattern.
//   'powerup-roll' → #spawnPattern draws from the config weighted table and
//                    spawns the winning power-up type.

/**
 * Telegraphed life pickup approach.
 *
 * Two leading flowers guide the player toward the pickup lane, one easy
 * obstacle BEFORE the heart so the reward feels earned (not free), then
 * the heart itself on lane 0. The obstacle at offset 0 is a single-lane
 * block only, ensuring the opposite two lanes are always clear — this is
 * intentionally trivial (difficulty 0) so it passes isSolvable and
 * isCollectible unconditionally.
 *
 * The obstacle is placed on lane +1 and the heart on lane 0 so the
 * approach telegraph reads "step left to earn the heart".
 *
 * High-heart placement: a stone obstacle in lane 0 at offset 10 makes the
 * player airborne in lane 0 when they jump it. At base speed the jump arc
 * lasts ~31 world-units (ceil(2×16.5/0.95) × 0.90), so the player is still
 * airborne at offset 30 (10 + 31 > 30) — isCollectible(high:true) can now
 * confirm reachability.  Without this in-lane obstacle the validator only
 * modelled airborne states in lane +1 (from the mushroom jump), never in
 * the pickup lane, making lifePickupHighChance a dead knob.
 *
 * Items are expressed at lane 0 (the pickup lane). #tickLife mirrors the
 * whole pattern to the validated lane via a lane-offset applied at spawn time
 * (the pattern is cloned with lane shifted before being passed to #spawnPattern).
 */
export const LIFE_PICKUP_SPECIAL = Object.freeze({
  id: 'special-life-pickup-safe',
  difficulty: 0,
  items: [
    // Telegraph: two flowers leading into the safe lane.
    { kind: 'flower', lane: 0, offset: 0  },
    { kind: 'flower', lane: 0, offset: 8  },
    // In-lane stone at offset 10: provides an airborne state in lane 0 so
    // isCollectible(high:true) can confirm the heart at offset 30 is reachable
    // via a jump.  This is the enabling obstacle for high-heart placement.
    { kind: 'obstacle', lane: 0, type: 'stone', offset: 10 },
    // Mushroom on adjacent lane (lane +1 relative to pickup lane).
    // Still present as a lane-pressure cue; the stone at lane 0 is now
    // the canonical jump gate for the high-heart path.
    { kind: 'obstacle', lane: 1, type: 'mushroom', variant: 'red', offset: 18 },
    // The life pickup itself — collectible field triggers 'life' resolution.
    { kind: 'flower', lane: 0, collectible: 'life', offset: 30 },
  ],
});

/**
 * Telegraphed power-up intro.
 *
 * Clean line of three flowers converging to the center, then the power-up.
 * No obstacles — power-ups are presented as pure positive events, so they
 * don't need an "earned" gate. The leading flowers create a visual funnel
 * that draws the player's eye to the pickup lane.
 *
 * 'collectible': 'powerup-roll' is resolved at spawn time by #spawnPattern
 * via a seeded draw from the config weighted table (same logic that was
 * previously inline in #tickPowerUp).
 */
export const POWERUP_INTRO_SPECIAL = Object.freeze({
  id: 'special-powerup-intro',
  difficulty: 0,
  items: [
    { kind: 'flower', lane: -1, offset: 0  },
    { kind: 'flower', lane: 0,  offset: 0  },
    { kind: 'flower', lane: 1,  offset: 0  },
    { kind: 'flower', lane: 0,  offset: 10, collectible: 'powerup-roll' },
  ],
});
