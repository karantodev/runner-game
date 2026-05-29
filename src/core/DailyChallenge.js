/**
 * Today's seed + the leaderboard scoped to that seed.
 *
 * Design:
 *   - Seed derived from local-date `YYYY-MM-DD` → stable for every player
 *     on the same calendar day, regardless of timezone they ARE on.
 *   - Per-day storage key so yesterday's board is preserved but isolated.
 *   - The same Leaderboard class handles persistence; we just give it a
 *     differently-scoped storage key.
 *
 * Public API:
 *   - `seedForToday()` — string usable as world.rng seed
 *   - `getLeaderboard()` — Leaderboard instance bound to today's key
 *   - `getYesterdayLeaderboard()` — for "yesterday's top" display
 */
import { Leaderboard } from './Leaderboard.js';

export class DailyChallenge {
  constructor({ baseKey, capacity = 10 }) {
    this.baseKey = baseKey;
    this.capacity = capacity;
    /**
     * The YMD captured at run-start. Once a daily run is in flight, we
     * use THIS date for the seed and the leaderboard submission, even if
     * the real clock crosses midnight before the player dies. Prevents
     * the "score for yesterday's seed submitted to today's board" bug.
     */
    this.lockedYmd = null;
  }

  /**
   * Capture today's date for the upcoming run. Idempotent until
   * unlockYmd() is called.
   */
  lockForRun() {
    if (this.lockedYmd === null) this.lockedYmd = ymd(new Date());
    return this.lockedYmd;
  }

  /** Clear the lock — call when the daily run ends. */
  unlockYmd() {
    this.lockedYmd = null;
  }

  /** Active seed. Prefers the locked YMD when a run is in progress. */
  seedForToday() {
    return `daily-${this.lockedYmd ?? this.#todayYmd()}`;
  }

  /** Leaderboard for the active run (locked date if mid-run). */
  getLeaderboard() {
    const key = `${this.baseKey}.${this.lockedYmd ?? this.#todayYmd()}`;
    return new Leaderboard(key, this.capacity);
  }

  getYesterdayLeaderboard() {
    const key = `${this.baseKey}.${this.#yesterdayYmd()}`;
    return new Leaderboard(key, this.capacity);
  }

  #todayYmd() {
    return ymd(new Date());
  }

  #yesterdayYmd() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return ymd(d);
  }
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
