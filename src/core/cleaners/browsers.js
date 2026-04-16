import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists } from '../shell.js';

export default {
  id: 'browsers',
  label: 'Browser caches',
  platforms: ['darwin'],
  risk: 'careful',

  async scan() {
    if (!IS_MAC) return [];
    const items = [];

    const targets = [
      ['chrome',       'Google Chrome',           'Google/Chrome'],
      ['chrome-canary','Chrome Canary',           'Google/Chrome Canary'],
      ['chromium',     'Chromium',                'Chromium'],
      ['brave',        'Brave',                   'BraveSoftware/Brave-Browser'],
      ['edge',         'Microsoft Edge',          'Microsoft Edge'],
      ['arc',          'Arc',                     'company.thebrowser.Browser'],
      ['firefox',      'Firefox',                 'Firefox'],
      ['safari',       'Safari',                  'com.apple.Safari'],
    ];

    for (const [id, label, cachePath] of targets) {
      const p = macLibrary('Caches', cachePath);
      if (exists(p)) {
        const bytes = await dirSizeAsync(p);
        if (bytes > 0) {
          items.push({
            id: `${id}-cache`,
            label: `${label} cache`,
            path: p,
            bytes,
            description: 'browser refetches web assets — may log you out of some sites',
          });
        }
      }
    }

    return items;
  },
};
