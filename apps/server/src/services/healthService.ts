export function getHealth() {
  return {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
  };
}