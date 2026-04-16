import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists } from '../shell.js';

export default {
  id: 'ruby',
  label: 'Ruby',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    const items = [];

    // Bundler cache
    const bundleCache = join(HOME, '.bundle', 'cache');
    if (exists(bundleCache)) {
      items.push({
        id: 'bundler-cache',
        label: 'Bundler cache',
        path: bundleCache,
        bytes: await dirSizeAsync(bundleCache),
      });
    }

    // gem downloaded archives
    const gemCache = join(HOME, '.gem', 'ruby');
    if (exists(gemCache)) {
      items.push({
        id: 'gem-cache',
        label: 'RubyGems user cache',
        path: gemCache,
        bytes: await dirSizeAsync(gemCache),
        risk: 'moderate',
        description: 'user-installed gems will re-install',
      });
    }

    // CocoaPods download cache
    const cpCache = IS_MAC
      ? macLibrary('Caches', 'CocoaPods')
      : join(HOME, '.cache', 'CocoaPods');
    if (exists(cpCache)) {
      items.push({
        id: 'cocoapods-cache',
        label: 'CocoaPods download cache',
        path: cpCache,
        bytes: await dirSizeAsync(cpCache),
      });
    }

    return items;
  },
};
