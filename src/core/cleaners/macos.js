import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists, sh } from '../shell.js';

export default {
  id: 'macos',
  label: 'macOS system caches',
  platforms: ['darwin'],
  risk: 'moderate',

  async scan() {
    if (!IS_MAC) return [];
    const items = [];

    // Trash
    const trash = join(HOME, '.Trash');
    if (exists(trash)) {
      const bytes = await dirSizeAsync(trash);
      if (bytes > 0) {
        items.push({
          id: 'trash',
          label: 'Trash (~/.Trash)',
          path: trash,
          bytes,
          risk: 'careful',
          description: 'permanently deletes files in Trash',
        });
      }
    }

    // User logs
    const userLogs = macLibrary('Logs');
    if (exists(userLogs)) {
      items.push({
        id: 'user-logs',
        label: 'User logs (~/Library/Logs)',
        path: userLogs,
        bytes: await dirSizeAsync(userLogs),
        description: 'app log files — regenerate as apps run',
      });
    }

    // Diagnostic reports
    const diag = macLibrary('Logs', 'DiagnosticReports');
    if (exists(diag)) {
      const bytes = await dirSizeAsync(diag);
      if (bytes > 0) {
        items.push({
          id: 'diagnostic-reports',
          label: 'Crash / diagnostic reports',
          path: diag,
          bytes,
        });
      }
    }

    // QuickLook thumbnail cache
    items.push({
      id: 'quicklook-cache',
      label: 'QuickLook thumbnail cache',
      bytes: 0, // estimate via command — too variable to size reliably
      command: 'qlmanage -r cache >/dev/null 2>&1 || true',
      description: 'Finder QuickLook previews rebuild on demand',
      risk: 'safe',
    });

    // Saved Application State (cruft from long-closed apps)
    const savedState = macLibrary('Saved Application State');
    if (exists(savedState)) {
      const bytes = await dirSizeAsync(savedState);
      if (bytes > 50 * 1024 * 1024) {
        items.push({
          id: 'saved-app-state',
          label: 'Saved Application State',
          path: savedState,
          bytes,
          risk: 'moderate',
          description: 'apps lose "reopen with state" info, otherwise harmless',
        });
      }
    }

    // iOS device backups — VERY careful
    const iosBackups = macLibrary('Application Support', 'MobileSync', 'Backup');
    if (exists(iosBackups)) {
      const bytes = await dirSizeAsync(iosBackups);
      if (bytes > 100 * 1024 * 1024) {
        items.push({
          id: 'ios-backups',
          label: 'iOS device backups',
          path: iosBackups,
          bytes,
          risk: 'careful',
          description: 'iPhone/iPad backups — DO NOT DELETE unless you have another backup',
        });
      }
    }

    // ~/Library/Caches top-level (everything not already covered elsewhere)
    // Summarize total so user can optionally nuke
    const libCaches = macLibrary('Caches');
    if (exists(libCaches)) {
      const bytes = await dirSizeAsync(libCaches);
      items.push({
        id: 'library-caches-all',
        label: 'All ~/Library/Caches (aggressive)',
        path: libCaches,
        bytes,
        risk: 'careful',
        description: 'nukes the whole Library/Caches dir — apps will rebuild caches, some may prompt for logins',
      });
    }

    return items;
  },
};
