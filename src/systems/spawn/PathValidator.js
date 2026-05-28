// Min world-unit gap required to physically switch one lane.
// At base speed 0.9: 8 units ≈ 9 frames ≈ 150 ms (reaction + lane travel).
const LANE_SWITCH_UNITS = 8;

// World units the player stays airborne after jumping a vine.
// Derived from vy=-16.5 / gravity=0.95 → ~34.7 frames; at base speed 0.9 ≈ 31 world units.
// Using 34 as the nominal ceiling to stay conservative across speeds.
const JUMP_AIRBORNE_UNITS = 34;

// World units the player stays crouched after a tap (matches Player config's
// crouch.minHoldFrames = 26 at base speed 0.9 → ~23 units; round up to 24
// to stay forgiving against fractional simulation rounding).
const CROUCH_HELD_UNITS = 24;

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

    // State: { lane, airborne, landAt, crouching, crouchUntil, posAt }
    //   lane         — current lane (-1 / 0 / 1)
    //   airborne     — player is in the air (cannot duck)
    //   landAt       — pattern offset when player lands (only meaningful when airborne)
    //   crouching    — player is ducking
    //   crouchUntil  — pattern offset at which the duck expires (meaningful when crouching)
    //   posAt        — pattern offset when this state was established;
    //                  -Infinity = before the pattern → unlimited lane freedom
    let states = [-1, 0, 1].map(lane => ({
      lane, airborne: false, landAt: -Infinity,
      crouching: false, crouchUntil: -Infinity,
      posAt: -Infinity,
    }));

    for (const obs of obstacles) {
      const next = [];

      for (const s of states) {
        const isAirborne = s.airborne && s.landAt > obs.offset;
        const isCrouching = s.crouching && s.crouchUntil > obs.offset;

        // How many lane switches can the player make by the time this obstacle arrives?
        // posAt = -Infinity → elapsed = Infinity → shift = 2 (all lanes reachable).
        const elapsed = obs.offset - s.posAt;
        const shift = Math.min(2, isFinite(elapsed) ? Math.floor(elapsed / LANE_SWITCH_UNITS) : 2);
        const reachable = [-1, 0, 1].filter(l => Math.abs(l - s.lane) <= shift);

        if (obs.type === 'overhang') {
          // Overhead barrier across all 3 lanes.
          // Jumping into it = collision; lane-switch doesn't help (spans the road).
          if (isAirborne) continue;
          if (isCrouching) {
            for (const l of reachable) {
              next.push({
                lane: l, airborne: false, landAt: -Infinity,
                crouching: true, crouchUntil: s.crouchUntil,
                posAt: obs.offset,
              });
            }
          } else {
            // On the ground, not crouched → must duck right now.
            for (const l of reachable) {
              next.push({
                lane: l, airborne: false, landAt: -Infinity,
                crouching: true, crouchUntil: obs.offset + CROUCH_HELD_UNITS,
                posAt: obs.offset,
              });
            }
          }
        } else if (obs.allLanes) {
          // Vine — must be airborne. Cannot duck under a vine.
          if (isAirborne) {
            for (const l of reachable) {
              next.push({
                lane: l, airborne: true, landAt: s.landAt,
                crouching: false, crouchUntil: -Infinity,
                posAt: obs.offset,
              });
            }
          } else if (isCrouching) {
            // Locked in a crouch when a vine arrives → cannot jump out fast enough.
            // (Jump from crouch is gated by minHoldFrames; if the duck has not
            // expired yet this branch dies.)
            continue;
          } else {
            for (const l of reachable) {
              next.push({
                lane: l, airborne: true, landAt: obs.offset + JUMP_AIRBORNE_UNITS,
                crouching: false, crouchUntil: -Infinity,
                posAt: obs.offset,
              });
            }
          }
        } else {
          for (const l of reachable) {
            if (l !== obs.lane) {
              // Dodge by being in a different lane — keep airborne / crouch state.
              next.push({
                lane: l,
                airborne: isAirborne,
                landAt: isAirborne ? s.landAt : -Infinity,
                crouching: isCrouching,
                crouchUntil: isCrouching ? s.crouchUntil : -Infinity,
                posAt: obs.offset,
              });
            } else if (isAirborne) {
              // Same lane as obstacle but still airborne — cleared by the jump.
              next.push({
                lane: l, airborne: true, landAt: s.landAt,
                crouching: false, crouchUntil: -Infinity,
                posAt: obs.offset,
              });
            }
            // l === obs.lane AND grounded → state eliminated (crouch doesn't clear ground hazards).
          }
        }
      }

      states = this.#dedup(next);
      if (states.length === 0) {
        const label = obs.type === 'overhang'
          ? 'overhang'
          : obs.allLanes
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
      const key = `${s.lane}|${s.airborne ? 1 : 0}|${Math.round(s.landAt)}|${s.crouching ? 1 : 0}|${Math.round(s.crouchUntil)}`;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  }
}
