/**
 * Local high-score leaderboard, persisted in localStorage.
 *
 * Storage shape:
 *   { entries: Array<{ name: string, score: number, distance: number, ts: number }> }
 *
 * Entries are sorted by score (desc), tie-break by distance (desc), then
 * timestamp (asc — older first). The list is capped at `capacity`.
 *
 * The class is tolerant of corrupt / missing storage — any parse failure
 * resets to an empty leaderboard rather than throwing.
 */
const MAX_NAME_LENGTH = 16;

export class Leaderboard {
  /**
   * @param {string} storageKey
   * @param {number} [capacity]
   */
  constructor(storageKey, capacity = 10) {
    this.storageKey = storageKey;
    this.capacity = capacity;
    this.entries = this.#load();
  }

  /** Returns the persisted list (copy — caller can mutate safely). */
  list() {
    return this.entries.slice();
  }

  /**
   * Does this score qualify for the leaderboard at all (not yet full, or
   * better than the current floor)?
   * @param {number} score
   */
  qualifies(score) {
    if (score <= 0) return false;
    if (this.entries.length < this.capacity) return true;
    return score > this.entries[this.entries.length - 1].score;
  }

  /**
   * Add a new run. Returns the rank (1-based) it ended up at, or 0 if
   * it didn't make the cut.
   *
   * @param {{ name: string, score: number, distance?: number, ts?: number }} entry
   */
  submit({ name, score, distance = 0, ts = Date.now() }) {
    if (!this.qualifies(score)) return 0;
    const cleanName = sanitizeName(name);
    const next = this.entries.slice();
    next.push({ name: cleanName, score, distance, ts });
    next.sort(byScoreDescDistanceDescTsAsc);
    if (next.length > this.capacity) next.length = this.capacity;
    this.entries = next;
    this.#persist();
    return next.findIndex((e) => e.ts === ts && e.name === cleanName && e.score === score) + 1;
  }

  /** Wipe everything (for a "Reset scores" UI). */
  clear() {
    this.entries = [];
    this.#persist();
  }

  #load() {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.entries)) return [];
      return parsed.entries
        .filter(isValidEntry)
        .map((e) => ({
          name: sanitizeName(e.name),
          score: Number(e.score) | 0,
          distance: Number(e.distance) | 0,
          ts: Number(e.ts) || 0,
        }))
        .sort(byScoreDescDistanceDescTsAsc)
        .slice(0, this.capacity);
    } catch {
      return [];
    }
  }

  #persist() {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify({ entries: this.entries }));
    } catch {
      // localStorage can be unavailable (private mode, file://, etc).
      // Leaderboard quietly degrades to session-only in that case.
    }
  }
}

function isValidEntry(e) {
  return e && typeof e.name === 'string' && Number.isFinite(Number(e.score));
}

function byScoreDescDistanceDescTsAsc(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.distance !== a.distance) return b.distance - a.distance;
  return a.ts - b.ts;
}

function sanitizeName(raw) {
  const trimmed = String(raw ?? '').trim().slice(0, MAX_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : 'Anonymous';
}
