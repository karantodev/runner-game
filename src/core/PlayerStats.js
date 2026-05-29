/**
 * Aggregate stats persisted across runs.
 *
 * Storage shape:
 *   {
 *     lifetimeOrchids:     number,
 *     lifetimeRareOrchids: number,
 *     lifetimeDistance:    number,
 *     lifetimeNearMisses:  number,
 *     runCount:            number,
 *     longestRunDistance:  number,
 *     dailyStreak:         number,
 *     lastPlayDate:        string  // YYYY-MM-DD local
 *   }
 *
 * `dailyStreak` increments when the player plays on a day adjacent to
 * `lastPlayDate`, resets if a day was skipped, stays the same on multiple
 * runs the same day.
 *
 * Tolerant of corrupt / missing storage — any parse failure resets to
 * zeroed totals rather than throwing.
 */
const EMPTY = Object.freeze({
  lifetimeOrchids: 0,
  lifetimeRareOrchids: 0,
  lifetimeDistance: 0,
  lifetimeNearMisses: 0,
  runCount: 0,
  longestRunDistance: 0,
  dailyStreak: 0,
  lastPlayDate: '',
  /**
   * v3.5: ring of recent run distances (newest LAST). Capped at
   * RECENT_RUNS_WINDOW. AdaptiveSkill reads this to classify the player
   * as struggling / normal / skilled and bias the difficulty curve.
   */
  recentRunDistances: /** @type {readonly number[]} */ (Object.freeze([])),
});

const RECENT_RUNS_WINDOW = 5;

export class PlayerStats {
  /** @param {string} storageKey */
  constructor(storageKey) {
    this.storageKey = storageKey;
    this.data = this.#load();
  }

  snapshot() {
    return { ...this.data };
  }

  /**
   * Apply the results of a finished run. Idempotent against null-ish
   * counts; safe to call with zeros.
   *
   * @param {{
   *   orchids: number,
   *   rareOrchids: number,
   *   distance: number,
   *   nearMisses: number,
   * }} run
   */
  recordRun(run) {
    const orchids = Math.max(0, run.orchids | 0);
    const rare = Math.max(0, run.rareOrchids | 0);
    const distance = Math.max(0, Math.floor(run.distance ?? 0));
    const nearMisses = Math.max(0, run.nearMisses | 0);

    this.data.lifetimeOrchids += orchids;
    this.data.lifetimeRareOrchids += rare;
    this.data.lifetimeDistance += distance;
    this.data.lifetimeNearMisses += nearMisses;
    this.data.runCount += 1;
    if (distance > this.data.longestRunDistance) this.data.longestRunDistance = distance;

    // Push into the recent-runs window. Allocates a new array (small,
    // bounded length) so the snapshot view stays immutable.
    const next = [...this.data.recentRunDistances, distance];
    if (next.length > RECENT_RUNS_WINDOW) next.splice(0, next.length - RECENT_RUNS_WINDOW);
    this.data.recentRunDistances = next;

    this.#updateStreak();
    this.#persist();
  }

  /**
   * Daily streak rules:
   *   - same day as lastPlayDate → no change
   *   - 1-day gap                → +1
   *   - any larger gap           → reset to 1
   *   - lastPlayDate empty       → 1
   */
  #updateStreak() {
    const today = todayLocalYmd();
    const last = this.data.lastPlayDate;
    if (last === today) return;
    if (!last) {
      this.data.dailyStreak = 1;
    } else if (isYesterday(last, today)) {
      this.data.dailyStreak += 1;
    } else {
      this.data.dailyStreak = 1;
    }
    this.data.lastPlayDate = today;
  }

  /** Wipe everything (for a future "Reset stats" UI). */
  clear() {
    this.data = { ...EMPTY };
    this.#persist();
  }

  #load() {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return { ...EMPTY };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return { ...EMPTY };
      // Coerce every numeric field to a finite integer; tolerate older
      // shapes that lack newer keys by falling back to EMPTY defaults.
      return {
        lifetimeOrchids: toInt(parsed.lifetimeOrchids),
        lifetimeRareOrchids: toInt(parsed.lifetimeRareOrchids),
        lifetimeDistance: toInt(parsed.lifetimeDistance),
        lifetimeNearMisses: toInt(parsed.lifetimeNearMisses),
        runCount: toInt(parsed.runCount),
        longestRunDistance: toInt(parsed.longestRunDistance),
        dailyStreak: toInt(parsed.dailyStreak),
        lastPlayDate: typeof parsed.lastPlayDate === 'string' ? parsed.lastPlayDate : '',
        recentRunDistances: Array.isArray(parsed.recentRunDistances)
          ? parsed.recentRunDistances.map(toInt).slice(-RECENT_RUNS_WINDOW)
          : [],
      };
    } catch {
      return { ...EMPTY };
    }
  }

  #persist() {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch {
      // localStorage unavailable — stats degrade to in-memory only.
    }
  }
}

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function todayLocalYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isYesterday(prevYmd, todayYmd) {
  // Compare via Date math so month boundaries work correctly. Treat the
  // prev date as midnight local; adding 1 day must equal today's date.
  const [py, pm, pd] = prevYmd.split('-').map(Number);
  const prev = new Date(py, (pm | 0) - 1, pd | 0);
  prev.setDate(prev.getDate() + 1);
  const expected = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
  return expected === todayYmd;
}
