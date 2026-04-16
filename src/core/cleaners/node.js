import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists, sh } from '../shell.js';

export default {
  id: 'node',
  label: 'Node.js package managers',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    const items = [];

    // npm cache
    const npmCache = join(HOME, '.npm');
    if (exists(npmCache)) {
      const bytes = await dirSizeAsync(npmCache);
      items.push({
        id: 'npm-cache',
        label: 'npm cache (~/.npm)',
        path: npmCache,
        bytes,
        description: 'npm download cache + logs',
      });
    }

    // npx cache (lives inside ~/.npm/_npx, but useful to surface if large)
    const npxCache = join(HOME, '.npm', '_npx');
    if (exists(npxCache)) {
      const bytes = await dirSizeAsync(npxCache);
      if (bytes > 20 * 1024 * 1024) {
        items.push({
          id: 'npx-cache',
          label: 'npx runtime cache',
          path: npxCache,
          bytes,
          description: 'one-shot package execution cache (subset of ~/.npm)',
        });
      }
    }

    // Yarn classic (v1)
    const yarnV1 = join(HOME, '.yarn', 'cache');
    if (exists(yarnV1)) {
      items.push({
        id: 'yarn-v1-cache',
        label: 'Yarn v1 cache (~/.yarn/cache)',
        path: yarnV1,
        bytes: await dirSizeAsync(yarnV1),
      });
    }

    // Yarn berry (v2+) global cache on macOS
    if (IS_MAC) {
      const yarnBerry = macLibrary('Caches', 'Yarn');
      if (exists(yarnBerry)) {
        items.push({
          id: 'yarn-berry-cache',
          label: 'Yarn Berry cache',
          path: yarnBerry,
          bytes: await dirSizeAsync(yarnBerry),
        });
      }
    }

    // pnpm store
    const pnpmStorePath = sh('pnpm store path 2>/dev/null') || join(HOME, '.pnpm-store');
    if (exists(pnpmStorePath)) {
      items.push({
        id: 'pnpm-store',
        label: 'pnpm content store',
        path: pnpmStorePath,
        bytes: await dirSizeAsync(pnpmStorePath),
        description: 'shared package store — safe to clear, will re-download on install',
        command: 'pnpm store prune >/dev/null 2>&1 || true',
      });
    }

    // Bun cache (install cache)
    const bunInstallCache = join(HOME, '.bun', 'install', 'cache');
    if (exists(bunInstallCache)) {
      items.push({
        id: 'bun-install-cache',
        label: 'Bun install cache',
        path: bunInstallCache,
        bytes: await dirSizeAsync(bunInstallCache),
      });
    }

    // Bunx — Bun uses ~/.bun/install/cache for bunx too; bunx has no separate cache dir

    // node-gyp cache
    const nodeGyp = join(HOME, '.node-gyp');
    if (exists(nodeGyp)) {
      items.push({
        id: 'node-gyp',
        label: 'node-gyp headers cache',
        path: nodeGyp,
        bytes: await dirSizeAsync(nodeGyp),
      });
    }

    // Corepack cache
    const corepack = IS_MAC
      ? macLibrary('Caches', 'node', 'corepack')
      : join(HOME, '.cache', 'node', 'corepack');
    if (exists(corepack)) {
      items.push({
        id: 'corepack',
        label: 'Corepack cache',
        path: corepack,
        bytes: await dirSizeAsync(corepack),
      });
    }

    // Electron download cache
    const electron = IS_MAC
      ? macLibrary('Caches', 'electron')
      : join(HOME, '.cache', 'electron');
    if (exists(electron)) {
      const bytes = await dirSizeAsync(electron);
      if (bytes > 10 * 1024 * 1024) {
        items.push({
          id: 'electron-cache',
          label: 'Electron download cache',
          path: electron,
          bytes,
        });
      }
    }

    // Cypress binary cache
    const cypress = IS_MAC
      ? macLibrary('Caches', 'Cypress')
      : join(HOME, '.cache', 'Cypress');
    if (exists(cypress)) {
      const bytes = await dirSizeAsync(cypress);
      if (bytes > 50 * 1024 * 1024) {
        items.push({
          id: 'cypress-cache',
          label: 'Cypress binary cache',
          path: cypress,
          bytes,
          description: 'Cypress will re-download on next run',
        });
      }
    }

    // Puppeteer
    const puppeteer = join(HOME, '.cache', 'puppeteer');
    if (exists(puppeteer)) {
      items.push({
        id: 'puppeteer-cache',
        label: 'Puppeteer browser cache',
        path: puppeteer,
        bytes: await dirSizeAsync(puppeteer),
      });
    }

    // Playwright
    const playwright = IS_MAC
      ? macLibrary('Caches', 'ms-playwright')
      : join(HOME, '.cache', 'ms-playwright');
    if (exists(playwright)) {
      const bytes = await dirSizeAsync(playwright);
      if (bytes > 50 * 1024 * 1024) {
        items.push({
          id: 'playwright-cache',
          label: 'Playwright browser cache',
          path: playwright,
          bytes,
          risk: 'moderate',
          description: 'used by Playwright tests — will re-download',
        });
      }
    }

    // nvm cache
    const nvmCache = join(HOME, '.nvm', '.cache');
    if (exists(nvmCache)) {
      items.push({
        id: 'nvm-cache',
        label: 'nvm download cache',
        path: nvmCache,
        bytes: await dirSizeAsync(nvmCache),
      });
    }

    return items;
  },
};
