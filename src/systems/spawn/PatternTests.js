import { PatternLibrary } from './PatternLibrary.js';
import { PathValidator } from './PathValidator.js';
import { DifficultyDirector } from './DifficultyDirector.js';

// ── Known-impossible fixture used to confirm the validator catches failures ──

const KNOWN_IMPOSSIBLE = {
  id: '_test_impossible',
  difficulty: 0,
  items: [
    { kind: 'obstacle', lane: -1, type: 'wall',     offset: 0 },
    { kind: 'obstacle', lane: 0,  type: 'mushroom', variant: 'red', offset: 0 },
    { kind: 'obstacle', lane: 1,  type: 'wheat',    offset: 0 },
  ],
};

// A vine immediately followed by an obstacle 4 units later — player is still
// airborne and should clear it automatically (not a rejection).
const VINE_AIRBORNE_CLEAR = {
  id: '_test_vine_airborne_clear',
  difficulty: 0,
  items: [
    { kind: 'obstacle', allLanes: true, type: 'vine', offset: 0 },
    { kind: 'obstacle', lane: 0, type: 'wall', offset: 4 },
  ],
};

// ── Simulated game worlds for speed-tier tests ───────────────────────────────

const SPEED_TIERS = [
  { label: 'start',      score: 0,   timeAlive: 0,    speed: 0.90 },
  { label: 'mid',        score: 50,  timeAlive: 600,  speed: 1.10 },
  { label: 'late',       score: 100, timeAlive: 1200, speed: 1.35 },
  { label: 'expert',     score: 150, timeAlive: 2000, speed: 1.58 },
  { label: 'burst',      score: 50,  timeAlive: 600,  speed: 1.42, speedBurstActive: true },
  { label: 'split-mid',  score: 50,  timeAlive: 600,  speed: 1.10, splitClonesActive: true },
];

// ── Public test runner ────────────────────────────────────────────────────────

/**
 * Validates every pattern and runs 10,000 simulated spawns across all
 * speed / power-up tiers. Returns a structured results object.
 */
export function runPatternTests() {
  const library   = new PatternLibrary();
  const validator = new PathValidator();
  const director  = new DifficultyDirector();

  const results = { passed: 0, failed: 0, failures: [] };

  // ── 1. Individual pattern validation ───────────────────────────────────────

  for (const pattern of library.allPatterns()) {
    const { solvable, rejectionReason } = validator.analyze(pattern);
    if (solvable) {
      results.passed++;
    } else {
      results.failed++;
      results.failures.push({ test: `pattern "${pattern.id}"`, reason: rejectionReason });
    }
  }

  // ── 2. Known-impossible must fail ──────────────────────────────────────────

  if (!validator.isSolvable(KNOWN_IMPOSSIBLE)) {
    results.passed++;
  } else {
    results.failed++;
    results.failures.push({ test: 'known-impossible fixture', reason: 'validator did not reject 3-lane simultaneous block' });
  }

  // ── 3. Vine airborne clear must succeed ────────────────────────────────────

  if (validator.isSolvable(VINE_AIRBORNE_CLEAR)) {
    results.passed++;
  } else {
    results.failed++;
    results.failures.push({ test: 'vine-airborne-clear fixture', reason: 'validator incorrectly rejected a pattern where player clears mid-air obstacle' });
  }

  // ── 4. Speed-tier stress test (10,000 total spawns) ───────────────────────

  const spawnsPerTier = Math.ceil(10000 / SPEED_TIERS.length);

  for (const tier of SPEED_TIERS) {
    const world = { score: tier.score, timeAlive: tier.timeAlive, speed: tier.speed };
    const diff  = director.get(world);
    const snap  = { splitClonesActive: !!tier.splitClonesActive, speedBurstActive: !!tier.speedBurstActive };
    let failed  = 0;

    for (let i = 0; i < spawnsPerTier; i++) {
      let pattern;
      if (snap.splitClonesActive) {
        pattern = library.pickSplitBonus();
      } else {
        const level = snap.speedBurstActive ? Math.min(diff.level, 2) : diff.level;
        pattern = library.pick(level);
      }
      if (!validator.isSolvable(pattern)) failed++;
    }

    if (failed === 0) {
      results.passed++;
    } else {
      results.failed++;
      results.failures.push({
        test: `stress tier "${tier.label}" (${spawnsPerTier} spawns)`,
        reason: `${failed} of ${spawnsPerTier} patterns failed validation`,
      });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  const total = results.passed + results.failed;
  results.summary = results.failed === 0
    ? `All ${total} checks passed.`
    : `${results.failed} of ${total} checks failed:\n` +
      results.failures.map(f => `  ✗ ${f.test}: ${f.reason}`).join('\n');

  return results;
}
