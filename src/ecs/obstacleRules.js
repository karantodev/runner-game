/**
 * Single gameplay contract for obstacle behavior.
 *
 * Factories, collision detection, spawn coordination, and path validation
 * must agree on these rules. Keeping them in one table prevents a pattern
 * from being considered solvable while runtime collision applies a
 * different interpretation.
 */
export const OBSTACLE_RULES = Object.freeze({
  vine: Object.freeze({
    clearBy: 'jump',
    allLanes: true,
    crossSourceGap: 36,
  }),
  wheat: Object.freeze({
    clearBy: 'jump',
    allLanes: false,
    crossSourceGap: 8,
  }),
  bush: Object.freeze({
    clearBy: 'jump',
    allLanes: false,
    crossSourceGap: 8,
  }),
  mushroom: Object.freeze({
    clearBy: 'jump',
    allLanes: false,
    crossSourceGap: 8,
  }),
  stone: Object.freeze({
    clearBy: 'jump',
    allLanes: false,
    crossSourceGap: 8,
  }),
  wall: Object.freeze({
    clearBy: 'jump',
    allLanes: false,
    crossSourceGap: 8,
  }),
  overhang: Object.freeze({
    clearBy: 'crouch',
    allLanes: true,
    crossSourceGap: 30,
  }),
});

const DEFAULT_RULE = Object.freeze({
  clearBy: 'dodge',
  allLanes: false,
  crossSourceGap: 8,
});

export function getObstacleRule(type) {
  return OBSTACLE_RULES[type] ?? DEFAULT_RULE;
}

export function obstacleSpansAllLanes(type, explicitAllLanes = false) {
  return explicitAllLanes || getObstacleRule(type).allLanes;
}
