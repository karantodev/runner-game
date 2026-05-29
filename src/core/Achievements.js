/**
 * Data-driven achievements.
 *
 * Each entry declares:
 *   - id        — stable string used in localStorage (don't rename)
 *   - title     — toast headline shown when unlocked
 *   - check     — predicate(stats, runContext, eventName, payload) → bool
 *
 * The system listens to EventBus events that move the needle (run end,
 * combo, rare collect) and re-evaluates predicates. A predicate returning
 * true unlocks the achievement; subsequent matches are no-ops (already
 * persisted in the unlocked set).
 *
 * No new component / system shape: this is a pure subscriber + a tiny
 * persistent set. Adding a new achievement = one row in ACHIEVEMENTS.
 */
export const ACHIEVEMENTS = Object.freeze([
  {
    id: 'first-run',
    title: 'First Steps',
    description: 'Complete your first run',
    check: (_stats, _ctx, event) => event === 'run:ended',
  },
  {
    id: 'orchid-100',
    title: 'Orchid Picker',
    description: 'Collect 100 orchids lifetime',
    check: (stats) => stats.lifetimeOrchids >= 100,
  },
  {
    id: 'orchid-500',
    title: 'Orchid Master',
    description: 'Collect 500 orchids lifetime',
    check: (stats) => stats.lifetimeOrchids >= 500,
  },
  {
    id: 'rare-5',
    title: 'Rare Hunter',
    description: 'Find 5 rare orchids',
    check: (stats) => stats.lifetimeRareOrchids >= 5,
  },
  {
    id: 'marathon-5k',
    title: 'Marathon',
    description: 'Run 5000m total',
    check: (stats) => stats.lifetimeDistance >= 5000,
  },
  {
    id: 'long-run-1k',
    title: 'Long Hauler',
    description: 'Reach 1000m in one run',
    check: (stats) => stats.longestRunDistance >= 1000,
  },
  {
    id: 'combo-king',
    title: 'Combo King',
    description: 'Reach ×8 multiplier',
    check: (_stats, ctx, event, payload) =>
      event === 'comboChanged' && payload?.multiplier >= 8,
  },
  {
    id: 'near-miss-10',
    title: 'Skin of Your Teeth',
    description: '10 near-misses lifetime',
    check: (stats) => stats.lifetimeNearMisses >= 10,
  },
  {
    id: 'streak-7',
    title: 'Week-long Streak',
    description: 'Play 7 days in a row',
    check: (stats) => stats.dailyStreak >= 7,
  },
]);

const TOAST_VISIBLE_MS = 2400;
const TOAST_FADE_MS = 280;

export class Achievements {
  /**
   * @param {{
   *   storageKey: string,
   *   eventBus: import('./EventBus.js').EventBus,
   *   playerStats: import('./PlayerStats.js').PlayerStats,
   * }} deps
   */
  constructor({ storageKey, eventBus, playerStats }) {
    this.storageKey = storageKey;
    this.eventBus = eventBus;
    this.playerStats = playerStats;
    this.unlocked = this.#load();
    this.toastQueue = [];
    this.toastBusy = false;
    this.#wire();
  }

  /** Snapshot for external surfaces (e.g. profile page). */
  list() {
    return ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: this.unlocked.has(a.id),
    }));
  }

  /** Forget all unlocks. Used by Settings → reset stats. */
  clear() {
    this.unlocked.clear();
    this.#persist();
  }

  #wire() {
    this.eventBus.on('run:ended', () => this.#evaluate('run:ended'));
    this.eventBus.on('comboChanged', (payload) => this.#evaluate('comboChanged', payload));
    this.eventBus.on('rare:collected', () => this.#evaluate('rare:collected'));
    this.eventBus.on('hazard:nearMiss', () => this.#evaluate('hazard:nearMiss'));
  }

  #evaluate(eventName, payload) {
    const stats = this.playerStats?.snapshot();
    if (!stats) return;
    for (const ach of ACHIEVEMENTS) {
      if (this.unlocked.has(ach.id)) continue;
      try {
        if (ach.check(stats, null, eventName, payload)) {
          this.unlocked.add(ach.id);
          this.#persist();
          this.#enqueueToast(ach);
        }
      } catch (err) {
        console.warn(`[Achievements] '${ach.id}' check threw:`, err);
      }
    }
  }

  #enqueueToast(ach) {
    this.toastQueue.push(ach);
    if (!this.toastBusy) this.#drainToasts();
  }

  async #drainToasts() {
    this.toastBusy = true;
    const el = document.getElementById('achievement-toast');
    const textEl = el?.querySelector('.achievement-text');
    while (this.toastQueue.length && el && textEl) {
      // v3.4: when 3 or more unlocks land at once (typical at run end,
      // where lifetime totals cross multiple thresholds), collapse them
      // into a single summary toast so the player isn't held hostage by
      // 12 seconds of sequential popups while the death screen waits.
      if (this.toastQueue.length >= 3) {
        const batch = this.toastQueue.splice(0, this.toastQueue.length);
        textEl.textContent = `${batch.length} achievements — open menu to view`;
        el.setAttribute('aria-hidden', 'false');
        el.classList.add('on');
        await delay(TOAST_VISIBLE_MS);
        el.classList.remove('on');
        await delay(TOAST_FADE_MS);
        el.setAttribute('aria-hidden', 'true');
        continue;
      }
      const next = this.toastQueue.shift();
      textEl.textContent = `${next.title} — ${next.description}`;
      el.setAttribute('aria-hidden', 'false');
      el.classList.add('on');
      await delay(TOAST_VISIBLE_MS);
      el.classList.remove('on');
      await delay(TOAST_FADE_MS);
      el.setAttribute('aria-hidden', 'true');
    }
    this.toastBusy = false;
  }

  #load() {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch { return new Set(); }
  }

  #persist() {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify([...this.unlocked]));
    } catch { /* localStorage unavailable */ }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
