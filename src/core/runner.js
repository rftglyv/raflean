import { rm, runCmd, exists, dirSizeAsync } from './shell.js';

/**
 * Runs every cleaner's scan() in parallel-ish, emitting progress.
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

// Delete a path and return how many bytes actually disappeared.
// Tolerant: permission / lock errors on individual files don't fail the whole op.
async function deleteAndMeasure(path) {
  if (!exists(path)) return 0;
  const before = await dirSizeAsync(path);
  rm(path);
  const after = exists(path) ? await dirSizeAsync(path) : 0;
  return Math.max(0, before - after);
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
        const paths = item.paths || (item.path ? [item.path] : []);
        let anyTouched = false;
        let pathsFreed = 0;
        for (const p of paths) {
          const delta = await deleteAndMeasure(p);
          if (delta > 0) { anyTouched = true; pathsFreed += delta; }
        }
        freed += pathsFreed;

        if (item.command) {
          const cmdOk = runCmd(item.command);
          if (cmdOk) {
            if (paths.length === 0) { freed += item.bytes || 0; }
            anyTouched = anyTouched || cmdOk;
          } else if (!anyTouched) {
            ok = false;
          }
        } else if (paths.length > 0 && !anyTouched) {
          ok = false;
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
