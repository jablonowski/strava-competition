export function fmtDistance(metres) {
  if (!metres) return null;
  return (metres / 1000).toFixed(1) + ' km';
}

export function fmtTime(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
