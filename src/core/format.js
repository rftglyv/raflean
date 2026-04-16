export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = (bytes / Math.pow(1024, i)).toFixed(i >= 2 ? 1 : 0);
  return `${val} ${units[i]}`;
}

export const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  gray:    '\x1b[90m',
};

export function sizeColor(bytes) {
  if (bytes > 1e9)    return c.red + c.bold;
  if (bytes > 500e6)  return c.red;
  if (bytes > 100e6)  return c.yellow;
  if (bytes > 10e6)   return c.cyan;
  return c.green;
}

export function colorBytes(bytes) {
  return sizeColor(bytes) + formatBytes(bytes) + c.reset;
}

export function bar(bytes, max, width = 20) {
  const frac = max > 0 ? bytes / max : 0;
  const fill = Math.round(Math.max(0, Math.min(1, frac)) * width);
  const filled = '█'.repeat(fill);
  const empty = '░'.repeat(width - fill);
  return sizeColor(bytes) + filled + c.gray + empty + c.reset;
}

export const RISK_LABEL = {
  safe:     'safe',
  moderate: 'moderate',
  careful:  'careful',
};

export function riskColor(risk) {
  return risk === 'careful'  ? c.red
       : risk === 'moderate' ? c.yellow
       : c.green;
}
