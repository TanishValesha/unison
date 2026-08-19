/**
 * Compute the target playback position a client should be at.
 * Same formula as the server.
 */
export function computeTargetPosition(
  serverPositionMs: number,
  serverTimestamp: number,
  clientNow: number,
  playbackRate: number
): number {
  const elapsed = (clientNow - serverTimestamp) * playbackRate;
  return serverPositionMs + elapsed;
}

export function getPositionError(
  targetPositionMs: number,
  currentPositionMs: number
): number {
  return targetPositionMs - currentPositionMs;
}