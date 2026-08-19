/**
 * Compute the target playback position a client should be at,
 * given the server's authoritative state and the client's current time.
 *
 * Formula:
 *   targetPosition = serverPosition + (clientNow - serverTimestamp) * playbackRate
 *
 * This accounts for the time elapsed since the server sent the SYNC message.
 */
export function computeTargetPosition(
  serverPositionMs: number,
  serverTimestamp: number,
  clientNow: number,
  playbackRate: number
): number {
  const elapsedMs = (clientNow - serverTimestamp) * playbackRate;
  return serverPositionMs + elapsedMs;
}

/**
 * Get the position error between target and current position.
 * Positive = client is behind, negative = client is ahead.
 */
export function getPositionError(
  targetPositionMs: number,
  currentPositionMs: number
): number {
  return targetPositionMs - currentPositionMs;
}

/**
 * Correction action types.
 */
export type CorrectionAction =
  | { type: 'none' }
  | { type: 'nudge'; rate: number; durationMs: number }
  | { type: 'seek'; positionMs: number };

/**
 * Decide what type of correction to apply based on the error magnitude.
 *
 * - Within tolerance: no correction needed
 * - Small drift (< 500ms): gradual correction by nudging playback rate
 * - Large drift: hard seek to target
 */
export function getCorrectionAction(
  errorMs: number,
  toleranceMs: number
): CorrectionAction {
  const absError = Math.abs(errorMs);

  if (absError <= toleranceMs) {
    return { type: 'none' };
  }

  if (absError < 500) {
    const rate = errorMs > 0 ? 1.05 : 0.95;
    return { type: 'nudge', rate, durationMs: 2000 };
  }

  return { type: 'seek', positionMs: errorMs };
}

/**
 * Estimate clock skew between client and server using round-trip time.
 *
 * client sends request at T0
 * server timestamps at T1
 * client receives at T2
 * estimated offset = T1 - (T0 + T2) / 2
 */
export function estimateClockSkew(
  clientSendTime: number,
  serverTimestamp: number,
  clientReceiveTime: number
): number {
  const rtt = clientReceiveTime - clientSendTime;
  const estimatedServerTimeAtReceive = serverTimestamp + rtt / 2;
  return estimatedServerTimeAtReceive - clientReceiveTime;
}

/**
 * Average multiple clock skew samples for better accuracy.
 */
export function averageClockSkew(samples: number[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((sum, s) => sum + s, 0) / samples.length;
}