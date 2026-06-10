export const PLAYER_CONFIG = {
  minLane: -1,
  maxLane: 1,
  laneLerp: 0.20,
  bottomMargin: 44,
  heroScale: 1.28,
  gravity: 0.95,
  jumpVelocity: -16.5,
  jumpHoldBoost: -0.8,
  maxJumpHoldFrames: 10,
  jumpBufferFrames: 6,
  crouchBufferFrames: 6,
  crouch: {
    minHoldFrames: 14,
    spriteYScale: 0.78,
  },
  // FSM tuning — thresholds used by PlayerPhysicsSystem to manage the
  // laneChanging state and the temporary hit-stun window.
  fsm: {
    // Frames the laneChanging state stays active after an actual lane step
    // (stamped by moveLane into LaneState.laneChangeFramesLeft). A frame
    // countdown, NOT a laneX-vs-target epsilon: the damp residual shrinks
    // by e^-(laneDamp × laneLerp) = e^-2.1 ≈ 0.1225 per fixed tick, so the
    // gap collapses in 2-3 frames and no epsilon yields a stable window
    // (0.12 gave exactly one frame; anything above 0.1225 never triggers).
    // 9 frames matches PathValidator's lane-switch model
    // (BASE_LANE_SWITCH_UNITS = 8 world units ≈ 8.9 frames at base speed
    // 0.9), so runtime forgiveness and spawn validation agree on how long
    // a swap "takes".
    laneChangeWindowFrames: 9,
    // Frames the FSM stays in 'hit' before returning to the recomputed
    // physical pose (jumping / crouching / running).
    hitStateFrames: 24,
  },

  // ── Visual feel knobs (PlayerPhysicsSystem) ───────────────────────────────────
  //
  // These control the "juice" layer — damping, tilt, squash/stretch, anim-rate —
  // without touching any gameplay-affecting values (gravity, jump, laneLerp).
  // Kept here (not inline) so a single file describes the full player feel.
  feel: {
    // Lane interpolation: damp coefficient multiplied by laneLerp.  The
    // product 10.5 × 0.20 = 2.1 is the effective spring constant per frame.
    // Higher → snappier lane snap; lower → floatier.
    laneDamp: 10.5,

    // Tilt towards the lane-velocity vector: gain (how much tilt per unit of
    // laneVelocity) and damp (how fast the tilt returns to zero). The asymmetry
    // (12 gain vs 10 damp) makes lean-in feel snappier than lean-out.
    laneTiltGain: 12,
    laneTiltDamp: 10,

    // Anim-rate clamp: world.speed is capped at animRateCap before being scaled
    // by animRateScale.  Prevents leg-spin from looking comical during speed-burst
    // (raw burst speed ≈ 1.58; capped at 1.15 × 0.7 ≈ 0.805 anim-ticks/frame).
    animRateCap:   1.15,
    animRateScale: 0.7,

    // Decay rates for the squash/stretch/hit-flash transient visuals.
    // All are subtracted per delta frame; tuned so each effect fades in ≈8-11
    // frames at 60 fps without lingering into the next beat.
    jumpStretchDecay: 0.11,
    landSquashDecay:  0.12,
    hitFlashDecay:    0.09,

    // Camera-shake magnitudes emitted on jump and crouch input.
    // Higher values = more screen jostle; these were chosen to feel punchy
    // without being disorienting at the baseline 60 fps target.
    jumpShake:   1.8,
    crouchShake: 0.9,
  },
};
