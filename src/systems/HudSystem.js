import { t } from '../core/i18n.js';

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Powerup type → PowerUpSystem snapshot field prefix + config slot. */
const TYPE_TO_CFG_KEY = Object.freeze({
  'speed-burst':  'speedBurst',
  'split-clones': 'splitClones',
  'magnet':       'magnet',
  'shield':       'shield',
  'score-x2':     'scoreX2',
});

/**
 * Hazard type → i18n key for the death-screen "You hit …" row.
 * Translated at render-time via t(). Adding a hazard type = one row
 * here + one row per language in i18n.js.
 */
const HAZARD_I18N = Object.freeze({
  vine: 'hazard.vine',
  overhang: 'hazard.overhang',
  bush: 'hazard.bush',
  mushroom: 'hazard.mushroom',
  wheat: 'hazard.wheat',
  wall: 'hazard.wall',
  stone: 'hazard.stone',
});

// Icon paths are read from world.config.assets (ASSETS_CONFIG) at render
// time so they flow through the single registered manifest, not a second
// parallel list of literal strings.
const JUMP_BAR_SEGMENTS = 5;

export class HudSystem {
  // Smoothed mouse-tilt target, normalized to [-1, 1] on each axis.
  // These are lerped toward each frame so motion is buttery, not jittery.
  #mouseTargetX = 0;
  #mouseTargetY = 0;
  // Current smoothed value (what's actually written to CSS vars).
  #mouseX = 0;
  #mouseY = 0;
  // Bound so we can remove it if teardown is ever added.
  #onMouseMove = null;
  // Coarse-pointer devices (touch) get a much-reduced mouse contribution.
  #isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  constructor(eventBus, world) {
    this.world = world;
    this.score = document.getElementById('score');
    this.hearts = document.getElementById('hearts');
    this.distance = document.getElementById('distance');
    this.tier = document.getElementById('tier');
    this.bestScore = document.getElementById('best-score');
    this.powerups = document.getElementById('powerups');
    this.powerupsBox = document.getElementById('powerups-box');
    this.jumpbar = document.getElementById('jumpbar');
    this.overlay = document.getElementById('overlay');
    this.stage = document.getElementById('stage');
    this.title = document.getElementById('title');
    this.sub = document.getElementById('sub');
    this.startButton = document.getElementById('start-button');

    // Mouse parallax: track pointer position relative to the stage so the
    // HUD tilts subtly toward the cursor. Disabled on coarse-pointer devices.
    this.#onMouseMove = (e) => {
      const rect = this.stage?.getBoundingClientRect();
      if (!rect) return;
      // Normalize to [-1, 1] with origin at stage center.
      this.#mouseTargetX = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      this.#mouseTargetY = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
    };
    window.addEventListener('mousemove', this.#onMouseMove, { passive: true });

    // Last-rendered cache so the DOM is touched only when a value actually changes.
    this._last = {
      score: -1,
      distance: -1,
      tier: '',
      best: -1,
      hearts: -1,
      heartsCapacity: -1,
      jumpbarFilled: -1,
      powerupsText: null,
      comboMultiplier: 1,
      comboWarning: false,
      hudTiltX: null,
      hudTiltY: null,
      hudDriftX: null,
      hudDriftY: null,
    };

    eventBus.on('scoreChanged', () => { this.#renderScore(); this.#renderTier(); });
    eventBus.on('livesChanged', () => this.#renderHearts());
    eventBus.on('tierChanged', () => this.#renderTier());
    eventBus.on('powerUpsChanged', () => this.#renderPowerUps());
    eventBus.on('distanceChanged', () => this.#renderDistance());
    eventBus.on('comboChanged', (snap) => this.#renderCombo(snap));
    eventBus.on('stateChanged', (state) => this.#state(state));
    /**
     * v3.5: re-render the visible overlay when the language changes so
     * the player sees translated copy immediately. The CustomEvent comes
     * from i18n.setLang() (decoupled from EventBus on purpose — i18n is
     * a stand-alone module).
     */
    window.addEventListener('i18n:changed', () => {
      this._last.tier = '';   // force tier re-render to update prefix
      this.#renderTier();
      // Re-fire the current state so #show() rebuilds card HTML with
      // fresh translations. Skip 'playing' since there's no overlay then.
      if (this.world.state !== 'playing') this.#state(this.world.state);
    });

    this.#renderAll();
  }

  bindStart(handler) {
    this.startButton.addEventListener('click', handler);
  }

  bindPause(handler) {
    document.getElementById('pause').addEventListener('click', handler);
  }

  /**
   * Per-frame tick for dynamic widgets that change continuously
   * (distance counter, jumpbar). Each setter is dirty-checked so the DOM
   * still only updates when a value actually changes.
   */
  tick() {
    this.#renderDistance();
    this.#renderJumpBar();
    this.#updatePowerMeters();
    this.#updateComboWarning();
    this.#updateSpatialHud();
  }

  #updateSpatialHud() {
    if (!this.stage) return;
    const player = this.world.player;
    const lane = player?.components.LaneState;
    const vert = player?.components.VerticalState;
    const speed = this.world.speed ?? this.world.config?.gameplay?.baseSpeed ?? 0;
    const baseSpeed = this.world.config?.gameplay?.baseSpeed ?? 1;
    const laneTilt = Math.max(-1, Math.min(1, lane?.laneTilt ?? 0));
    const laneOffset = Math.max(-1, Math.min(1, lane?.laneX ?? 0));
    const air = Math.max(0, Math.min(1, -((vert?.y ?? 0) / 140)));
    const speedPush = Math.max(0, Math.min(1, (speed - baseSpeed) / Math.max(1, baseSpeed * 1.8)));

    // Lerp mouse toward target each frame (α=0.08 ≈ 120ms settle).
    // Coarse-pointer devices (touch) get a 10× smaller contribution so the
    // effect is invisible rather than distracting on mobile.
    const mouseScale = this.#isCoarsePointer ? 0.02 : 0.22;
    const alpha = 0.08;
    this.#mouseX += (this.#mouseTargetX - this.#mouseX) * alpha;
    this.#mouseY += (this.#mouseTargetY - this.#mouseY) * alpha;

    // Add mouse term on top of the lane/speed-driven motion. Keep small so
    // gameplay tilt still dominates.
    const next = {
      hudTiltX: `${(-0.55 - air * 1.15 + speedPush * 0.45 + this.#mouseY * mouseScale * -0.8).toFixed(2)}deg`,
      hudTiltY: `${(laneTilt * 2.4 + laneOffset * 0.45 + this.#mouseX * mouseScale * 1.2).toFixed(2)}deg`,
      hudDriftX: `${(laneTilt * 2.8 + this.#mouseX * mouseScale * 1.8).toFixed(2)}px`,
      hudDriftY: `${(-air * 2.2 + speedPush * 1.2 + this.#mouseY * mouseScale * -1.4).toFixed(2)}px`,
    };
    for (const [key, value] of Object.entries(next)) {
      if (this._last[key] === value) continue;
      this._last[key] = value;
      this.stage.style.setProperty(`--${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`, value);
    }
  }

  /**
   * v3.5 combo decay warning. Per-frame check rather than an event so the
   * .warning class toggles smoothly as graceFrames crosses the threshold.
   * Cheap: it's one boolean read + a className diff.
   */
  #updateComboWarning() {
    if (!this._comboEl) return;
    const warn = this.world.comboSystem?.isWarning?.() ?? false;
    if (warn === this._last.comboWarning) return;
    this._last.comboWarning = warn;
    this._comboEl.classList.toggle('warning', warn);
  }

  /**
   * Update only the .powerup-meter-fill widths each tick, leaving the
   * row DOM alone. Cheap (querySelectorAll on a tiny container) and
   * keeps the bars draining smoothly without rebuilding HTML.
   */
  #updatePowerMeters() {
    const meters = this.powerups.querySelectorAll('.powerup-row');
    if (!meters.length) return;
    const snap = this.world.powerUpSystem.snapshot();
    const upCfg = this.world.config.powerUps;
    for (const row of meters) {
      const type = row.getAttribute('data-type');
      const cfgKey = TYPE_TO_CFG_KEY[type];
      if (!cfgKey) continue;
      const frames = snap[`${cfgKey}Frames`] ?? 0;
      const dur = upCfg[cfgKey]?.durationFrames ?? 1;
      const pct = Math.max(0, Math.min(100, (frames / dur) * 100));
      const fill = row.querySelector('.powerup-meter-fill');
      if (fill) fill.style.width = `${pct}%`;
    }
  }

  #renderAll() {
    this.#renderScore();
    this.#renderDistance();
    this.#renderHearts();
    this.#renderTier();
    this.#renderPowerUps();
    this.#renderJumpBar();
  }

  #renderScore() {
    if (this.world.score === this._last.score) return;
    this._last.score = this.world.score;
    this.score.textContent = String(this.world.score);
    if (this.world.bestScore !== this._last.best) {
      this._last.best = this.world.bestScore;
      this.bestScore.textContent = String(this.world.bestScore);
    }
  }

  #renderDistance() {
    const floored = Math.floor(this.world.distanceRun);
    if (floored === this._last.distance) return;
    this._last.distance = floored;
    this.distance.textContent = `${floored}m`;
  }

  #renderTier() {
    const label = this.#tierLabel();
    if (label === this._last.tier) return;
    this._last.tier = label;
    this.tier.textContent = label;
  }

  #renderHearts() {
    const lives = Math.max(0, this.world.lives);
    const capacity = Math.max(lives, this.world.config.gameplay.startLives);
    if (lives === this._last.hearts && capacity === this._last.heartsCapacity) return;
    const prevLives = this._last.hearts;
    this._last.hearts = lives;
    this._last.heartsCapacity = capacity;
    const heartFull = this.world.config.assets.uiHeartFull;
    const heartEmpty = this.world.config.assets.uiHeartEmpty;
    let html = '';
    for (let i = 0; i < capacity; i += 1) {
      const src = i < lives ? heartFull : heartEmpty;
      html += `<img src="${src}" class="hud-heart" alt="">`;
    }
    this.hearts.innerHTML = html;
    // M5-B: pulse the heart that just changed — red on loss, green/gold on
    // gain. Skip the initial paint (prevLives < 0). Pure DOM/CSS; no gameplay.
    if (prevLives >= 0 && lives !== prevLives) this.#pulseHeart(lives, prevLives);
  }

  /**
   * M5-B: one-shot CSS pulse on the heart whose state just flipped. Loss → the
   * heart that emptied (index `lives`); gain → the heart that filled
   * (index `lives - 1`). innerHTML was just rebuilt, so each <img> is a fresh
   * element and the animation plays once from the start when the class is added.
   */
  #pulseHeart(lives, prevLives) {
    const lost = lives < prevLives;
    const index = lost ? lives : lives - 1;
    const heart = this.hearts.children[index];
    if (!heart) return;
    heart.classList.add(lost ? 'heart-pulse-loss' : 'heart-pulse-gain');
  }

  #renderJumpBar() {
    const vert = this.world.player?.components.VerticalState;
    const filled = vert?.isJumping
      ? Math.max(0, JUMP_BAR_SEGMENTS - Math.floor(vert.jumpHoldFrames / 2))
      : JUMP_BAR_SEGMENTS;
    if (filled === this._last.jumpbarFilled) return;
    this._last.jumpbarFilled = filled;
    const energyFull = this.world.config.assets.uiEnergyFull;
    const energyEmpty = this.world.config.assets.uiEnergyEmpty;
    let html = '';
    for (let i = 0; i < JUMP_BAR_SEGMENTS; i += 1) {
      const src = i < filled ? energyFull : energyEmpty;
      html += `<img src="${src}" class="hud-energy" alt="">`;
    }
    this.jumpbar.innerHTML = html;
  }

  #renderPowerUps() {
    const html = this.#powerUpRowsHtml();
    if (html === this._last.powerupsText) return;
    this._last.powerupsText = html;
    this.powerups.innerHTML = html;
    this.powerupsBox.style.display = html ? '' : 'none';
  }

  /**
   * One row per active power-up: small colour-coded dot + label + draining
   * meter. Rows are rebuilt on every change; the meter width is updated
   * each frame in tick() so the bar drains smoothly without re-rendering
   * the row HTML.
   */
  #powerUpRowsHtml() {
    const snap = this.world.powerUpSystem.snapshot();
    const rows = [];
    const upCfg = this.world.config.powerUps;
    const ROWS = [
      { type: 'speed-burst',  label: 'Burst',   framesKey: 'speedBurstFrames',  activeKey: 'speedBurstActive',  durationCfg: upCfg.speedBurst.durationFrames },
      { type: 'split-clones', label: 'Split',   framesKey: 'splitClonesFrames', activeKey: 'splitClonesActive', durationCfg: upCfg.splitClones.durationFrames },
      { type: 'magnet',       label: 'Magnet',  framesKey: 'magnetFrames',      activeKey: 'magnetActive',      durationCfg: upCfg.magnet.durationFrames },
      { type: 'shield',       label: 'Shield',  framesKey: 'shieldFrames',      activeKey: 'shieldActive',      durationCfg: upCfg.shield.durationFrames },
      { type: 'score-x2',     label: '×2',      framesKey: 'scoreX2Frames',     activeKey: 'scoreX2Active',     durationCfg: upCfg.scoreX2.durationFrames },
    ];
    for (const row of ROWS) {
      if (!snap[row.activeKey]) continue;
      const frames = snap[row.framesKey] ?? 0;
      const pct = Math.max(0, Math.min(100, Math.floor((frames / row.durationCfg) * 100)));
      rows.push(`<div class="powerup-row" data-type="${row.type}">
        <span class="powerup-icon" style="background:currentColor"></span>
        <span class="powerup-label">${row.label}</span>
        <span class="powerup-meter"><span class="powerup-meter-fill" style="width:${pct}%"></span></span>
      </div>`);
    }
    return rows.join('');
  }

  /**
   * v3.1: combo multiplier shown next to the score. Implemented as a
   * sibling element (#combo) if present in DOM; falls back to suffixing
   * the score text if no dedicated slot exists. Hidden when multiplier=1.
   */
  #renderCombo(snap) {
    const mult = snap?.multiplier ?? 1;
    if (mult === this._last.comboMultiplier) return;
    this._last.comboMultiplier = mult;
    // Lazy lookup the first time — keeps the constructor decoupled from
    // a DOM element that older index.html builds may not have.
    if (this._comboEl === undefined) this._comboEl = document.getElementById('combo');
    if (this._comboEl) {
      if (mult > 1) {
        this._comboEl.textContent = `×${mult}`;
        this._comboEl.style.display = '';
      } else {
        this._comboEl.style.display = 'none';
      }
    }
  }

  #tierLabel() {
    if (this.world.currentTier <= 0) return t('death.tierStart');
    return `Tier ${this.world.currentTier}`;
  }

  #state(state) {
    if (state === 'playing') {
      this.overlay.classList.remove('on');
      return;
    }

    if (state === 'menu') {
      this.#show(
        t('menu.title'),
        t('menu.intro'),
        t('menu.start'),
      );
    }

    if (state === 'paused') {
      // Bento grid: Resume is the full-width hero tile; Restart/Settings/Quit
      // fill a 2×2 sub-grid below it. Continue is the existing #start-button.
      this.#show(
        t('pause.title'),
        `<div class="pause-bento">
           <div class="pause-bento-resume">
             <button type="button" id="pause-restart" class="pixel-btn" style="width:100%">${t('pause.restart')}</button>
           </div>
           <button type="button" id="pause-settings" class="pixel-btn">${t('pause.settings')}</button>
           <button type="button" id="pause-quit" class="pixel-btn">${t('pause.quit')}</button>
         </div>`,
        t('pause.resume'),
      );
      this.#wirePauseButtons();
    }

    if (state === 'dead') {
      this.#show(
        t('death.title'),
        this.#deathBody(),
        t('death.again'),
      );
      this.#wireLeaderboardSubmit();
      this.#wireShareButtons();
    }
  }

  /**
   * Bind in-pause actions. Continue is the existing #start-button CTA
   * (Game's hud.bindStart resumes if state === 'paused'); the other
   * three are wired here.
   */
  #wirePauseButtons() {
    const restart = document.getElementById('pause-restart');
    const settings = document.getElementById('pause-settings');
    const quit = document.getElementById('pause-quit');
    if (restart) {
      restart.addEventListener('click', () => {
        if (!confirm(t('pause.confirmRestart'))) return;
        this.world.start();
      });
    }
    if (settings) {
      // SettingsMenu.show() lives on the Game; expose via world hook.
      settings.addEventListener('click', () => {
        // Surface the modal directly — the settings button on main menu
        // already wires this in SettingsMenu.bind().
        document.getElementById('settings-button')?.click();
      });
    }
    if (quit) {
      quit.addEventListener('click', () => {
        // "Quit" puts us back in the menu state so the player can pick
        // Daily / Settings / a fresh run.
        this.world.state = 'menu';
        this.world.eventBus.emit('stateChanged', 'menu');
      });
    }
  }

  /**
   * Optional dependency: `world.share` is wired by the Game constructor.
   * Click handlers delegate to ShareSystem and replace the button text
   * with a transient confirmation so the player sees something happened.
   */
  #wireShareButtons() {
    const w = this.world;
    if (!w.share) return;
    const textBtn = document.getElementById('share-text');
    const shotBtn = document.getElementById('share-screenshot');
    const run = { score: w.score, distance: w.distanceRun };
    if (textBtn) {
      textBtn.addEventListener('click', async () => {
        const result = await w.share.share(run);
        const labels = { shared: '✓ Shared', copied: '✓ Copied', failed: 'Failed' };
        textBtn.textContent = labels[result] ?? '✓ Done';
      });
    }
    if (shotBtn) {
      shotBtn.addEventListener('click', async () => {
        shotBtn.textContent = '…capturing';
        const result = await w.share.screenshot(run);
        const labels = { shared: '✓ Shared', downloaded: '✓ Downloaded', failed: 'Failed' };
        shotBtn.textContent = labels[result] ?? '✓ Done';
      });
    }
  }

  /**
   * Build the death-screen body. If the run qualified for the leaderboard,
   * embed a name prompt; either way, render the current top-N list and the
   * lifetime stats footer.
   */
  #deathBody() {
    const w = this.world;
    const lb = w.leaderboard;
    const qualified = lb && w.lastRunRank === -1;
    const dailyTag = w.dailyMode ? `<span class="daily-label">DAILY</span>` : '';
    // v3.4: surface the death cause prominently so the player knows what
    // hit them — vines / overhangs / dry-grass etc. all have different
    // responses (jump vs crouch); seeing the cause closes the learning loop.
    const causeKey = HAZARD_I18N[w.lastHazardType];
    // v3.8.35 — sentence-case hazard + exclamation gives "You hit a vine!"
    // instead of "You hit a VINE". `death.youHit` template stays neutral so
    // the same wrapper renders all hazards.
    const causeRow = causeKey
      ? `<div class="death-cause">${t('death.youHit')} <b>${t(causeKey)}</b>!</div>`
      : '';
    // Bento grid: score is the hero tile (full-width), remaining stats fill
    // a 2-column grid. .run-summary kept as wrapper for external CSS targeting.
    const orchidExtra = w.rareOrchidsCollectedThisRun > 0
      ? `<span class="hud-rare"> +${w.rareOrchidsCollectedThisRun}r</span>`
      : '';
    const summary = `
      ${causeRow}
      <div class="run-summary">
        ${dailyTag ? `<div style="margin-bottom:6px">${dailyTag}</div>` : ''}
        <div class="death-bento">
          <div class="death-bento-cell death-bento-cell--score">
            <span class="death-bento-label">${t('death.score')}</span>
            <b>${w.score}</b>
          </div>
          <div class="death-bento-cell death-bento-cell--best">
            <span class="death-bento-label">${t('death.best')}</span>
            <b>${w.bestScore}</b>
          </div>
          <div class="death-bento-cell death-bento-cell--dist">
            <span class="death-bento-label">${t('death.distance')}</span>
            <b>${Math.floor(w.distanceRun)}m</b>
          </div>
          <div class="death-bento-cell death-bento-cell--orchids">
            <span class="death-bento-label">${t('death.orchids')}</span>
            <b>${w.orchidsCollectedThisRun}${orchidExtra}</b>
          </div>
          <div class="death-bento-cell death-bento-cell--miss">
            <span class="death-bento-label">${t('death.nearMisses')}</span>
            <b>${w.nearMissesThisRun}</b>
          </div>
          <div class="death-bento-cell death-bento-cell--tier">
            <span class="death-bento-label">Tier</span>
            <b>${this.#tierLabel()}</b>
          </div>
        </div>
      </div>
    `;
    // v3.8.35 — secondary action row near the top. RUN AGAIN remains the
    // bottom-of-card primary CTA bound by #show(); these are the
    // supporting actions (save score if eligible, share, screenshot)
    // grouped together so the player sees them as one option block
    // instead of a scattered tail.
    const saveBtn = qualified
      ? `<button type="button" id="death-save" class="death-action death-action-save">${t('death.saveScore')}</button>`
      : '';
    const actions = `
      <div class="death-actions">
        ${saveBtn}
        <button type="button" id="share-text" class="death-action">${t('death.share')}</button>
        <button type="button" id="share-screenshot" class="death-action">${t('death.screenshot')}</button>
      </div>
    `;
    // Name prompt only appears when SAVE SCORE is clicked, not unconditionally.
    // Keeps the modal compact for the common case (not qualified or already
    // saved). #wireLeaderboardSubmit handles the toggle.
    const prompt = qualified
      ? `
        <div class="leaderboard-prompt" id="leaderboard-prompt" hidden>
          <p>${t('death.topRank', { rank: lb.capacity })}</p>
          <input id="leaderboard-name" type="text" maxlength="16" placeholder="${t('death.namePlaceholder')}" autocomplete="off">
          <button id="leaderboard-submit" type="button">${t('death.saveScore')}</button>
        </div>
      `
      : '';
    // v3.8.35 — leaderboard + lifetime moved to a single "details" section
    // BELOW the action row, visually de-emphasized via .death-details
    // styling. The player who wants quick restart sees Run Complete →
    // stats → actions → RUN AGAIN without scrolling past historic data.
    const list = lb ? this.#leaderboardListHtml(lb.list()) : '';
    const stats = this.#lifetimeStatsHtml();
    const details = (list || stats)
      ? `<div class="death-details">${list}${stats}</div>`
      : '';
    return `${summary}${actions}${prompt}${details}`;
  }

  /**
   * v3.1: lifetime totals strip — gives long-time players a "look how far
   * I've come" surface. Hidden when PlayerStats wasn't wired in.
   */
  #lifetimeStatsHtml() {
    const stats = this.world.playerStats?.snapshot();
    if (!stats || stats.runCount === 0) return '';
    const streak = stats.dailyStreak > 1
      ? `[${t('lifetime.streak', { days: stats.dailyStreak })}]`
      : '';
    return `
      <div class="lifetime-stats">
        <h4>${t('lifetime.title')}</h4>
        <ul>
          <li>${t('lifetime.runs')}: <b>${stats.runCount}</b></li>
          <li>${t('lifetime.totalOrchids')}: <b>${stats.lifetimeOrchids}</b>${stats.lifetimeRareOrchids > 0 ? ` + ${stats.lifetimeRareOrchids} rare` : ''}</li>
          <li>${t('lifetime.totalDistance')}: <b>${stats.lifetimeDistance}m</b></li>
          <li>${t('lifetime.longest')}: <b>${stats.longestRunDistance}m</b></li>
          ${streak ? `<li>${streak}</li>` : ''}
        </ul>
      </div>
    `;
  }

  #leaderboardListHtml(entries) {
    if (!entries.length) return '';
    const rows = entries.map((e, i) => `
      <li><span class="lb-rank">${i + 1}.</span><span class="lb-name">${escapeHtml(e.name)}</span><b class="lb-score">${e.score}</b></li>
    `).join('');
    return `<ol class="leaderboard-list">${rows}</ol>`;
  }

  /**
   * v3.8.35 — leaderboard prompt is now hidden behind a SAVE SCORE button
   * in the action row. Reveals on click; focuses the name input; submits
   * via the same handler as Enter. Keeps the modal compact for the
   * non-qualifying common case and lets fast players RUN AGAIN without
   * tabbing through an unrelated name field.
   */
  #wireLeaderboardSubmit() {
    const saveBtn = document.getElementById('death-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const prompt = document.getElementById('leaderboard-prompt');
        if (!prompt) return;
        prompt.hidden = false;
        saveBtn.disabled = true;
        const input = document.getElementById('leaderboard-name');
        input?.focus();
      });
    }
    const input = document.getElementById('leaderboard-name');
    const submit = document.getElementById('leaderboard-submit');
    if (!input || !submit) return;
    const handler = () => {
      const w = this.world;
      const lb = w.leaderboard;
      if (!lb) return;
      const rank = lb.submit({
        name: input.value,
        score: w.score,
        distance: Math.floor(w.distanceRun),
      });
      w.lastRunRank = rank;
      // Re-render death body so the prompt disappears and the list reflects
      // the new entry.
      this.#show(t('death.title'), this.#deathBody(), t('death.again'));
    };
    submit.addEventListener('click', handler);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handler(); });
  }

  #show(title, sub, button) {
    this.title.textContent = title;
    this.sub.innerHTML = sub;
    this.startButton.textContent = button;
    this.overlay.classList.add('on');
  }
}
