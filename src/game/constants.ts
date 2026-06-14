/**
 * Engine constants — tunable values extracted from engine.ts for clarity and testability.
 * Keep these in sync with ProfileRules where they overlap.
 */

// Worm interaction
export const BLINK_RECOVER_MS = 220;
export const WORM_HIT_RADIUS_FACTOR = 3.1;
export const DIRECTION_EPSILON = 0.0001;

// Continuous mode tuning
export const CONTINUOUS_SPAWN_INTERVAL_MS = 1200; // base spawn interval
export const SPEED_MULTIPLIER_CAP = 2.5; // maximum speed multiplier relative to base
export const SPEED_RAMP_PER_SECOND = 0.12; // increase multiplier per second

// Fairy lifecycle
export const FAIRY_MORPH_DURATION_MS = 2_000;