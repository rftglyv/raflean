import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists } from '../shell.js';

// Electron-based editors all share a common cache structure under Application Support.
const ELECTRON_SUBDIRS = ['Cache', 'CachedData', 'Code Cache', 'GPUCache', 'logs', 'Crashpad'];

async function electronEditorItems(rootName, label, appSupportPath) {
  const items = [];
  if (!exists(appSupportPath)) return items;
  for (const sub of ELECTRON_SUBDIRS) {
    const p = join(appSupportPath, sub);
    if (exists(p)) {
      const bytes = await dirSizeAsync(p);
      if (bytes > 0) {
        items.push({
          id: `${rootName}-${sub.toLowerCase().replace(/\s+/g, '-')}`,
          label: `${label} ${sub}`,
          path: p,
          bytes,
        });
      }
    }
  }
  // Workspace storage — per-project cached metadata
  const ws = join(appSupportPath, 'User', 'workspaceStorage');
  if (exists(ws)) {
    const bytes = await dirSizeAsync(ws);
    if (bytes > 50 * 1024 * 1024) {
      items.push({
        id: `${rootName}-workspace-storage`,
        label: `${label} workspace storage`,
        path: ws,
        bytes,
        risk: 'moderate',
        description: 'per-project editor state (recent files, unsaved state)',
      });
    }
  }
  return items;
}

export default {
  id: 'editors',
  label: 'Editors & IDEs',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    if (!IS_MAC) return [];
    const items = [];

    // VS Code
    items.push(...await electronEditorItems('vscode', 'VS Code', macLibrary('Application Support', 'Code')));
    // VS Code Insiders
    items.push(...await electronEditorItems('vscode-insiders', 'VS Code Insiders', macLibrary('Application Support', 'Code - Insiders')));
    // Cursor
    items.push(...await electronEditorItems('cursor', 'Cursor', macLibrary('Application Support', 'Cursor')));
    // Windsurf
    items.push(...await electronEditorItems('windsurf', 'Windsurf', macLibrary('Application Support', 'Windsurf')));
    // Zed
    items.push(...await electronEditorItems('zed', 'Zed', macLibrary('Application Support', 'Zed')));

    // JetBrains caches and logs
    const jbCaches = macLibrary('Caches', 'JetBrains');
    if (exists(jbCaches)) {
      items.push({
        id: 'jetbrains-caches',
        label: 'JetBrains IDE caches',
        path: jbCaches,
        bytes: await dirSizeAsync(jbCaches),
      });
    }
    const jbLogs = macLibrary('Logs', 'JetBrains');
    if (exists(jbLogs)) {
      items.push({
        id: 'jetbrains-logs',
        label: 'JetBrains logs',
        path: jbLogs,
        bytes: await dirSizeAsync(jbLogs),
      });
    }

    // Sublime Text 4
    const sublimeCache = macLibrary('Caches', 'com.sublimetext.4');
    if (exists(sublimeCache)) {
      items.push({
        id: 'sublime-cache',
        label: 'Sublime Text cache',
        path: sublimeCache,
        bytes: await dirSizeAsync(sublimeCache),
      });
    }

    // Neovim cache
    const nvim = join(HOME, '.cache', 'nvim');
    if (exists(nvim)) {
      items.push({
        id: 'nvim-cache',
        label: 'Neovim cache',
        path: nvim,
        bytes: await dirSizeAsync(nvim),
      });
    }

    return items;
  },
};
