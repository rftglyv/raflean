import { sh, has } from '../shell.js';

function parseSize(str) {
  if (!str) return 0;
  const m = str.trim().match(/([\d.]+)\s*([KMGT]?B)/i);
  if (!m) return 0;
  const [, num, unit] = m;
  const mul = { b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12 };
  return parseFloat(num) * (mul[unit.toLowerCase()] || 1);
}

export default {
  id: 'docker',
  label: 'Docker',
  platforms: ['darwin', 'linux'],
  risk: 'moderate',

  async scan() {
    if (!has('docker')) return [];
    if (!sh('docker info 2>/dev/null')) return []; // daemon not running

    const raw = sh('docker system df 2>/dev/null');
    if (!raw) return [];

    const items = [];
    const lines = raw.split('\n').slice(1);
    const byType = {};

    for (const line of lines) {
      const cols = line.trim().split(/\s{2,}/);
      if (cols.length < 4) continue;
      const type = cols[0];
      const size = parseSize(cols[2]);
      const reclaimable = parseSize((cols[3] || '').replace(/\(.*?\)/, '').trim());
      byType[type] = { size, reclaimable };
    }

    const totalReclaim = Object.values(byType).reduce((s, v) => s + v.reclaimable, 0);

    if (totalReclaim > 0) {
      items.push({
        id: 'docker-prune-all',
        label: 'Docker system prune (all reclaimable)',
        bytes: totalReclaim,
        command: 'docker system prune -af --volumes',
        description: 'dangling images, stopped containers, unused volumes, build cache',
        meta: byType,
      });
    }

    // Build cache — often large, surface separately if available
    const buildCacheRaw = sh('docker builder prune --force --filter until=0s --dry-run 2>/dev/null');
    if (buildCacheRaw) {
      const m = buildCacheRaw.match(/Total:\s+([\d.]+\s*[KMGT]?B)/i);
      const bytes = m ? parseSize(m[1]) : 0;
      if (bytes > 100 * 1024 * 1024) {
        items.push({
          id: 'docker-builder-cache',
          label: 'Docker builder cache only',
          bytes,
          command: 'docker builder prune -af',
          risk: 'safe',
        });
      }
    }

    return items;
  },
};
