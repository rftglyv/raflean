import { homedir, platform } from 'node:os';
import { join } from 'node:path';

export const HOME = homedir();
export const PLATFORM = platform();
export const IS_MAC = PLATFORM === 'darwin';
export const IS_LINUX = PLATFORM === 'linux';
export const IS_WIN = PLATFORM === 'win32';

export function home(...parts) {
  return join(HOME, ...parts);
}

export function macLibrary(...parts) {
  return join(HOME, 'Library', ...parts);
}

export function xdgCache() {
  if (process.env.XDG_CACHE_HOME) return process.env.XDG_CACHE_HOME;
  if (IS_MAC) return macLibrary('Caches');
  return join(HOME, '.cache');
}

export function xdgData() {
  if (process.env.XDG_DATA_HOME) return process.env.XDG_DATA_HOME;
  if (IS_MAC) return macLibrary('Application Support');
  return join(HOME, '.local', 'share');
}

export function xdgState() {
  if (process.env.XDG_STATE_HOME) return process.env.XDG_STATE_HOME;
  if (IS_MAC) return macLibrary('Application Support');
  return join(HOME, '.local', 'state');
}
