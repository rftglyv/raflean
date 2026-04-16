import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists, has, sh } from '../shell.js';

export default {
  id: 'homebrew',
  label: 'Homebrew',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    if (!has('brew')) return [];
    const items = [];

    // macOS default cache location
    const macBrew = macLibrary('Caches', 'Homebrew');
    if (IS_MAC && exists(macBrew)) {
      items.push({
        id: 'brew-cache',
        label: 'Homebrew download cache',
        path: macBrew,
        bytes: await dirSizeAsync(macBrew),
        postCommand: 'brew cleanup --prune=all >/dev/null 2>&1 || true',
      });
    }

    // Linux / custom HOMEBREW_CACHE
    const envCache = sh('brew --cache 2>/dev/null');
    if (envCache && envCache !== macBrew && exists(envCache)) {
      items.push({
        id: 'brew-cache-custom',
        label: `Homebrew cache (${envCache})`,
        path: envCache,
        bytes: await dirSizeAsync(envCache),
      });
    }

    // Old versions reclaimable via `brew cleanup -n`
    const preview = sh('brew cleanup -n 2>/dev/null');
    if (preview) {
      const m = preview.match(/This operation would free approximately ([\d.]+[KMGTB]+)/i);
      if (m) {
        const bytes = parseBrewSize(m[1]);
        if (bytes > 0) {
          items.push({
            id: 'brew-cleanup',
            label: 'Old Homebrew versions',
            bytes,
            command: 'brew cleanup --prune=all',
            description: 'removes outdated formula versions',
          });
        }
      }
    }

    return items;
  },
};

function parseBrewSize(str) {
  const m = str.match(/([\d.]+)([KMGTB]+)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  const mul = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };
  return n * (mul[u] || 1);
}
