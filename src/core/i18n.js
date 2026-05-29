/**
 * Lightweight i18n. Two languages bundled (EN baseline + ES). New
 * languages = one more dictionary object below.
 *
 * Usage:
 *   import { t } from './i18n.js';
 *   t('menu.start')            → "Start Run" / "Iniciar carrera"
 *   t('death.cause', { kind: 'a vine' })  → "You hit a vine!"
 *
 * Resolution order:
 *   1. Explicit `setLang()` from Settings
 *   2. localStorage cache (persisted after manual switch)
 *   3. navigator.language prefix match
 *   4. fall back to 'en'
 *
 * Missing keys: returns the key itself so missing translations surface
 * during dev instead of rendering empty.
 */

const DICTS = {
  en: {
    'menu.title': 'Orchid Quest',
    'menu.intro': 'Collect Orchids, jump over vines (SPACE / ↑), duck under hanging branches (↓ / S), and avoid harmful greens. Tree gives a speed burst. Purple mushroom splits you into clones.',
    'menu.start': 'Start Run',
    'menu.daily': 'Daily Challenge',
    'menu.settings': 'Settings',

    'pause.title': 'Paused',
    'pause.resume': 'Continue',
    'pause.restart': 'Restart run',
    'pause.settings': 'Settings',
    'pause.quit': 'Quit to menu',
    'pause.confirmRestart': 'Restart run? Current progress will be lost.',

    'death.title': 'Run Complete',
    'death.again': 'Run again',
    'death.score': 'Score',
    'death.distance': 'Distance',
    'death.orchids': 'Orchids',
    'death.nearMisses': 'Near misses',
    'death.best': 'Best',
    'death.youHit': 'You hit',
    'death.tierStart': 'Tier: Start',
    'death.share': 'SHARE',
    'death.screenshot': 'SCREENSHOT',

    'settings.title': 'Settings',
    'settings.sfx': 'SFX',
    'settings.music': 'Music',
    'settings.shake': 'Camera shake',
    'settings.particles': 'Particles',
    'settings.quality': 'Quality',
    'settings.qualityAuto': 'Auto',
    'settings.lang': 'Language',
    'settings.langEN': 'English',
    'settings.langES': 'Spanish',
    'settings.resetStats': 'Reset lifetime stats',
    'settings.resetLb': 'Reset leaderboard',
    'settings.close': 'Close',
    'settings.confirmResetStats': 'Reset all lifetime stats? This cannot be undone.',
    'settings.confirmResetLb': 'Reset the leaderboard?',
    'settings.comingSoon': '(coming soon)',

    'lifetime.title': 'Lifetime',
    'lifetime.runs': 'Runs',
    'lifetime.totalOrchids': 'Total orchids',
    'lifetime.totalDistance': 'Total distance',
    'lifetime.longest': 'Longest run',
    'lifetime.streak': '{days}-day streak',

    'hazard.vine': 'a VINE',
    'hazard.overhang': 'an OVERHANG',
    'hazard.bush': 'a SPIKY BUSH',
    'hazard.mushroom': 'a MUSHROOM',
    'hazard.wheat': 'a DRY GRASS',
    'hazard.wall': 'a WALL',
    'hazard.stone': 'a STONE',
  },
  es: {
    'menu.title': 'Orchid Quest',
    'menu.intro': 'Recoge orquídeas, salta sobre las lianas (ESPACIO / ↑), agáchate bajo las ramas (↓ / S) y evita las plantas peligrosas. El árbol da un impulso de velocidad. El champiñón morado te divide en clones.',
    'menu.start': 'Iniciar carrera',
    'menu.daily': 'Desafío diario',
    'menu.settings': 'Ajustes',

    'pause.title': 'Pausado',
    'pause.resume': 'Continuar',
    'pause.restart': 'Reiniciar carrera',
    'pause.settings': 'Ajustes',
    'pause.quit': 'Salir al menú',
    'pause.confirmRestart': '¿Reiniciar carrera? Se perderá el progreso actual.',

    'death.title': 'Carrera completada',
    'death.again': 'Correr de nuevo',
    'death.score': 'Puntuación',
    'death.distance': 'Distancia',
    'death.orchids': 'Orquídeas',
    'death.nearMisses': 'Esquivadas justas',
    'death.best': 'Récord',
    'death.youHit': 'Chocaste con',
    'death.tierStart': 'Nivel: Inicio',
    'death.share': 'COMPARTIR',
    'death.screenshot': 'CAPTURA',

    'settings.title': 'Ajustes',
    'settings.sfx': 'Efectos',
    'settings.music': 'Música',
    'settings.shake': 'Vibración de cámara',
    'settings.particles': 'Partículas',
    'settings.quality': 'Calidad',
    'settings.qualityAuto': 'Auto',
    'settings.lang': 'Idioma',
    'settings.langEN': 'Inglés',
    'settings.langES': 'Español',
    'settings.resetStats': 'Reiniciar estadísticas',
    'settings.resetLb': 'Reiniciar tabla',
    'settings.close': 'Cerrar',
    'settings.confirmResetStats': '¿Reiniciar todas las estadísticas? No se puede deshacer.',
    'settings.confirmResetLb': '¿Reiniciar la tabla de récords?',
    'settings.comingSoon': '(próximamente)',

    'lifetime.title': 'Total',
    'lifetime.runs': 'Carreras',
    'lifetime.totalOrchids': 'Total de orquídeas',
    'lifetime.totalDistance': 'Distancia total',
    'lifetime.longest': 'Mejor carrera',
    'lifetime.streak': 'racha de {days} días',

    'hazard.vine': 'una LIANA',
    'hazard.overhang': 'una RAMA BAJA',
    'hazard.bush': 'un ARBUSTO ESPINOSO',
    'hazard.mushroom': 'un CHAMPIÑÓN',
    'hazard.wheat': 'la HIERBA SECA',
    'hazard.wall': 'un MURO',
    'hazard.stone': 'una PIEDRA',
  },
};

const LANG_STORAGE_KEY = 'orchidQuest.lang.v1';

/** Resolve initial language at module-load. */
function detectDefault() {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && DICTS[stored]) return stored;
  } catch { /* localStorage unavailable */ }
  const nav = (navigator.language ?? 'en').toLowerCase();
  if (nav.startsWith('es')) return 'es';
  return 'en';
}

let current = detectDefault();

/**
 * Set active language. Persists choice. Emits a CustomEvent so HudSystem
 * can re-render any cached HTML — listening is opt-in (we don't carry
 * an event bus here to keep i18n decoupled from gameplay code).
 */
export function setLang(lang) {
  if (!DICTS[lang]) return;
  current = lang;
  try { window.localStorage.setItem(LANG_STORAGE_KEY, lang); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
}

export function getLang() { return current; }
export function availableLangs() { return Object.keys(DICTS); }

/**
 * Translate. Falls back to English then to the key string itself.
 *
 * Variable interpolation: `t('lifetime.streak', { days: 7 })` replaces
 * `{days}` in the value with 7. Cheap regex; no escape semantics needed
 * for game UI use cases.
 */
export function t(key, vars = null) {
  const value =
    DICTS[current]?.[key]
    ?? DICTS.en[key]
    ?? key;
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (_m, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}
