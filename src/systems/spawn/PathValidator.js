// Min world-unit gap required to physically switch one lane.
// At base speed 0.9: 8 units ≈ 9 frames ≈ 150 ms (reaction + lane travel).
const LANE_SWITCH_UNITS = 8;

// World units the player stays airborne after jumping a vine.
// Derived from vy=-16.5 / gravity=0.95 → ~34.7 frames; at base speed 0.9 ≈ 31 world units.
// Using 34 as the nominal ceiling to stay conservative across speeds.
const JUMP_AIRBORNE_UNITS = 34;

export class PathValidator {
  isSolvable(pattern) {
    return this.#simulate(pattern).solvable;
  }

  // Returns { solvable, rejectionReason, finalStates }
  analyze(pattern) {
    return this.#simulate(pattern);
  }

  // ── Simulation ───────────────────────────────────────────────────────────────

  #simulate(pattern) {
    const obstacles = pattern.items
      .filter(i => i.kind === 'obstacle')
      .sort((a, b) => a.offset - b.offset);

    if (obstacles.length === 0) {
      return { solvable: true, rejectionReason: null, finalStates: [] };
    }

    // State: { lane, airborne, landAt, posAt }
    //   lane     — current lane (-1 / 0 / 1)
    //   airborne — player is in the air
    //   landAt   — pattern offset when player lands (only relevant when airborne)
    //   posAt    — pattern offset when this state was established;
    //              -Infinity = before the pattern → unlimited lane freedom
    let states = [-1, 0, 1].map(lane => ({
      lane, airborne: false, landAt: -Infinity, posAt: -Infinity,
    }));

    for (const obs of obstacles) {
      const next = [];

      for (const s of states) {
        const isAirborne = s.airborne && s.landAt > obs.offset;

        // How many lane switches can the player make by the time this obstacle arrives?
        // posAt = -Infinity → elapsed = Infinity → shift = 2 (all lanes reachable).
        const elapsed = obs.offset - s.posAt;
        const shift = Math.min(2, isFinite(elapsed) ? Math.floor(elapsed / LANE_SWITCH_UNITS) : 2);
        const reachable = [-1, 0, 1].filter(l => Math.abs(l - s.lane) <= shift);

        if (obs.allLanes) {
          if (isAirborne) {
            // Already in the air — vine is at ground level, player clears it automatically.
            for (const l of reachable) {
              next.push({ lane: l, airborne: true, landAt: s.landAt, posAt: obs.offset });
            }
          } else {
            // On the ground — must jump.
            for (const l of reachable) {
              next.push({ lane: l, airborne: true, landAt: obs.offset + JUMP_AIRBORNE_UNITS, posAt: obs.offset });
            }
          }
        } else {
          for (const l of reachable) {
            if (l !== obs.lane) {
              // Dodge by being in a different lane.
              next.push({ lane: l, airborne: isAirborne, landAt: isAirborne ? s.landAt : -Infinity, posAt: obs.offset });
            } else if (isAirborne) {
              // Same lane as obstacle but still airborne — cleared by the jump.
              next.push({ lane: l, airborne: true, landAt: s.landAt, posAt: obs.offset });
            }
            // l === obs.lane AND not airborne → state eliminated.
          }
        }
      }

      states = this.#dedup(next);
      if (states.length === 0) {
        const label = obs.allLanes
          ? 'vine'
          : `${obs.type ?? 'obstacle'} in lane ${obs.lane}`;
        return {
          solvable: false,
          rejectionReason: `No valid path at offset ${obs.offset} (${label})`,
          finalStates: [],
        };
      }
    }

    return { solvable: true, rejectionReason: null, finalStates: states };
  }

  #dedup(states) {
    const seen = new Set();
    return states.filter(s => {
      const key = `${s.lane}|${s.airborne ? 1 : 0}|${Math.round(s.landAt)}`;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  }
}
