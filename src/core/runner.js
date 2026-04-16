import { rm, runCmd } from './shell.js';

/**
 * Runs every cleaner's scan() in parallel-ish, emitting progress.
 * Each cleaner may return an array of items, or null/undefined if not applicable.
 *
 * Item shape:
 *   { id, cleanerId, cleanerLabel, label, bytes, risk, description?,
 *     path? OR paths? OR command?, postCommand?, sudo? }
 *
 * onEvent({ type, ... }):
 *   { type: 'cleaner-start', cleanerId, label }
 *   { type: 'cleaner-done',  cleanerId, items, ms }
 *   { type: 'cleaner-error', cleanerId, error }
 */
export async function scanAll(cleaners, onEvent = () => {}) {
  const all = [];
  await Promise.all(cleaners.map(async (cleaner) => {
    const started = Date.now();
    onEvent({ type: 'cleaner-start', cleanerId: cleaner.id, label: cleaner.label });
    try {
      const items = await cleaner.scan();
      const normalized = (items || [])
        .filter(Boolean)
        .map((item) => ({
          cleanerId: cleaner.id,
          cleanerLabel: cleaner.label,
          risk: item.risk || cleaner.risk || 'safe',
          bytes: item.bytes || 0,
          ...item,
        }));
      all.push(...normalized);
      onEvent({
        type: 'cleaner-done',
        cleanerId: cleaner.id,
        items: normalized,
        ms: Date.now() - started,
      });
    } catch (error) {
      onEvent({
        type: 'cleaner-error',
        cleanerId: cleaner.id,
        error: error?.message || String(error),
      });
    }
  }));
  all.sort((a, b) => (b.bytes || 0) - (a.bytes || 0));
  return all;
}

/**
 * Cleans the given items. Respects { dryRun }.
 *
 * onEvent({ type, ... }):
 *   { type: 'item-start', item }
 *   { type: 'item-done',  item, freed, ok }
 */
export async function cleanItems(items, { dryRun = false, onEvent = () => {} } = {}) {
  let totalFreed = 0;
  for (const item of items) {
    onEvent({ type: 'item-start', item });
    let ok = true;
    let freed = 0;

    try {
      if (dryRun) {
        freed = item.bytes || 0;
      } else {
        if (item.command) {
          ok = runCmd(item.command);
          if (ok) freed += item.bytes || 0;
        }
        if (item.path) {
          if (rm(item.path)) freed += item.bytes || 0;
          else ok = false;
        }
        if (item.paths && item.paths.length > 0) {
          let anyRemoved = false;
          for (const p of item.paths) {
            if (rm(p)) anyRemoved = true;
          }
          if (anyRemoved) freed += item.bytes || 0;
          else ok = false;
        }
        if (item.postCommand) runCmd(item.postCommand);
      }
    } catch {
      ok = false;
    }

    totalFreed += freed;
    onEvent({ type: 'item-done', item, freed, ok });
  }
  return { totalFreed };
}
