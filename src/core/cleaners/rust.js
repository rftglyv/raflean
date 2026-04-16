import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists } from '../shell.js';

export default {
  id: 'rust',
  label: 'Rust / Cargo',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    const items = [];

    const cargoHome = process.env.CARGO_HOME || join(HOME, '.cargo');

    // Cargo registry cache (.crate archives) — always safe, re-downloadable
    const registryCache = join(cargoHome, 'registry', 'cache');
    if (exists(registryCache)) {
      items.push({
        id: 'cargo-registry-cache',
        label: 'Cargo registry cache',
        path: registryCache,
        bytes: await dirSizeAsync(registryCache),
      });
    }

    // Cargo registry src — unpacked sources, re-extractable
    const registrySrc = join(cargoHome, 'registry', 'src');
    if (exists(registrySrc)) {
      items.push({
        id: 'cargo-registry-src',
        label: 'Cargo registry unpacked sources',
        path: registrySrc,
        bytes: await dirSizeAsync(registrySrc),
        risk: 'safe',
      });
    }

    // Git checkouts (for git dependencies)
    const gitDb = join(cargoHome, 'git', 'db');
    if (exists(gitDb)) {
      items.push({
        id: 'cargo-git-db',
        label: 'Cargo git deps database',
        path: gitDb,
        bytes: await dirSizeAsync(gitDb),
      });
    }
    const gitCheckouts = join(cargoHome, 'git', 'checkouts');
    if (exists(gitCheckouts)) {
      items.push({
        id: 'cargo-git-checkouts',
        label: 'Cargo git checkouts',
        path: gitCheckouts,
        bytes: await dirSizeAsync(gitCheckouts),
      });
    }

    // sccache cache
    const sccache = IS_MAC
      ? macLibrary('Caches', 'Mozilla.sccache')
      : join(HOME, '.cache', 'sccache');
    if (exists(sccache)) {
      items.push({
        id: 'sccache',
        label: 'sccache compiler cache',
        path: sccache,
        bytes: await dirSizeAsync(sccache),
      });
    }

    return items;
  },
};
