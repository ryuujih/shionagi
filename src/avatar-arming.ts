/** Single combat-mode gate: stage3 ∧ onFoot ∧ near ∧ !dialogue (+ enabled, !down).
 *  Drives EMP draw/holster, HUD density, and over-shoulder camera together. */
export type ArmingState = {
  enabled: boolean; dialogue: boolean; down: boolean; onFoot: boolean;
  stage: number; near: boolean;
};

/** True when explore→combat should arm EMP, densify HUD, and ease camera. */
export function wantArmed(state: ArmingState): boolean {
  return state.enabled && !state.dialogue && !state.down && state.onFoot
    && state.stage === 3 && state.near;
}

/** Alias — one condition for EMP / HUD / camera; no separate state machine. */
export const isCombatMode = wantArmed;

export const AIM_DURATION = 0.4;
export function stepAimBlend(blend: number, armed: boolean, dt: number): number {
  const current = Math.max(0, Math.min(1, blend));
  const step = Math.max(0, dt) / AIM_DURATION;
  return armed ? Math.min(1, current + step) : Math.max(0, current - step);
}

/** Avatar forward is -Z. Negative pitch points the holstered barrel down/back. */
export function sampleArmingPose(blend: number) {
  const t = Math.max(0, Math.min(1, blend));
  return {
    x: -0.52 + 0.87 * t,
    y: 1.0 + 0.05 * t,
    z: -0.12 - 0.28 * t,
    pitch: -1.85 + 1.85 * t,
    armPitch: -0.72 * t,
  };
}

/** Explore TPS (blend 0) → slight over-shoulder (blend 1). Same 0.4s ease as EMP. */
export function sampleCombatCamera(blend: number) {
  const t = Math.max(0, Math.min(1, blend));
  return {
    back: 4.8 - 0.35 * t,
    side: 0.7 + 0.55 * t,
    lift: 0.45 + 0.12 * t,
  };
}
