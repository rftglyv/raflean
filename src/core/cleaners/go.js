import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists, sh, has } from '../shell.js';

export default {
  id: 'go',
  label: 'Go',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    const items = [];

    // GOCACHE — build cache
    let goCache = sh('go env GOCACHE 2>/dev/null');
    if (!goCache) {
      goCache = IS_MAC
        ? macLibrary('Caches', 'go-build')
        : join(HOME, '.cache', 'go-build');
    }
    if (exists(goCache)) {
      items.push({
        id: 'go-build-cache',
        label: 'Go build cache',
        path: goCache,
        bytes: await dirSizeAsync(goCache),
        command: has('go') ? 'go clean -cache >/dev/null 2>&1 || true' : undefined,
      });
    }

    // Module download cache
    let goModCache = sh('go env GOMODCACHE 2>/dev/null');
    if (!goModCache) {
      const gopath = sh('go env GOPATH 2>/dev/null') || join(HOME, 'go');
      goModCache = join(gopath, 'pkg', 'mod');
    }
    if (exists(goModCache)) {
      items.push({
        id: 'go-mod-cache',
        label: 'Go module cache',
        path: goModCache,
        bytes: await dirSizeAsync(goModCache),
        command: has('go') ? 'go clean -modcache >/dev/null 2>&1 || true' : undefined,
      });
    }

    return items;
  },
};
