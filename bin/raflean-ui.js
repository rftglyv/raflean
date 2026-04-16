#!/usr/bin/env node
/**
 * raflean-ui — Ink-powered rich TUI.
 * Depends on: ink, react. Shares src/core with the plain CLI.
 */

import React, { useEffect, useReducer, useState, useMemo, useRef } from 'react';
import { render, Box, Text, useInput, useApp, Static, Newline } from 'ink';
import { allCleaners } from '../src/core/registry.js';
import { scanAll, cleanItems } from '../src/core/runner.js';
import { diskUsage } from '../src/core/shell.js';
import { formatBytes } from '../src/core/format.js';

const argv = process.argv.slice(2);
const ARG = {
  dryRun: argv.includes('--dry-run'),
};

const RISK_COLOR = {
  safe: 'green',
  moderate: 'yellow',
  careful: 'red',
};

const h = React.createElement;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCountdown() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 10), 80);
    return () => clearInterval(id);
  }, []);
  return frame;
}

function Spinner() {
  const frame = useCountdown();
  const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  return h(Text, { color: 'cyan' }, frames[frame]);
}

function SizeText({ bytes, width }) {
  const color =
    bytes > 1e9    ? 'redBright' :
    bytes > 500e6  ? 'red' :
    bytes > 100e6  ? 'yellow' :
    bytes > 10e6   ? 'cyan' :
    'green';
  const text = formatBytes(bytes || 0);
  const padded = width ? text.padStart(width) : text;
  return h(Text, { color, bold: bytes > 1e9 }, padded);
}

function ProgressBar({ value, total, width = 30 }) {
  const frac = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const fill = Math.round(frac * width);
  return h(Box, null,
    h(Text, { color: 'cyan' }, '█'.repeat(fill)),
    h(Text, { color: 'gray' }, '░'.repeat(width - fill)),
  );
}

function Bar({ bytes, max, width = 16 }) {
  const frac = max > 0 ? Math.max(0, Math.min(1, bytes / max)) : 0;
  const fill = Math.round(frac * width);
  const color =
    bytes > 1e9    ? 'redBright' :
    bytes > 500e6  ? 'red' :
    bytes > 100e6  ? 'yellow' :
    bytes > 10e6   ? 'cyan' :
    'green';
  return h(Box, null,
    h(Text, { color }, '█'.repeat(fill)),
    h(Text, { color: 'gray' }, '░'.repeat(width - fill)),
  );
}

// ─── Banner ────────────────────────────────────────────────────────────────────

function Banner() {
  const disk = useMemo(() => diskUsage(), []);
  return h(Box, { flexDirection: 'column', marginBottom: 1 },
    h(Text, { color: 'cyan', bold: true }, '  raflean  '),
    h(Text, { color: 'gray' }, '  universal storage cleaner for developers — by raffy'),
    disk && h(Box, { marginTop: 1 },
      h(Text, null, '  disk  '),
      h(Bar, { bytes: disk.used, max: disk.total, width: 30 }),
      h(Text, null, '  '),
      h(Text, {
        color: disk.used / disk.total > 0.85 ? 'red'
             : disk.used / disk.total > 0.70 ? 'yellow'
             : 'green',
        bold: true,
      }, `${Math.round(disk.used / disk.total * 100)}%`),
      h(Text, { color: 'gray' }, `  ${formatBytes(disk.free)} free of ${formatBytes(disk.total)}`),
    ),
  );
}

// ─── Scan screen ──────────────────────────────────────────────────────────────

function ScanScreen({ onComplete }) {
  const cleaners = useMemo(() => allCleaners(), []);
  const [states, setStates] = useState(() => {
    const s = {};
    for (const c of cleaners) s[c.id] = { status: 'pending', label: c.label, items: [] };
    return s;
  });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const items = await scanAll(cleaners, (ev) => {
        setStates((prev) => {
          const next = { ...prev };
          if (ev.type === 'cleaner-start') {
            next[ev.cleanerId] = { ...next[ev.cleanerId], status: 'running' };
          } else if (ev.type === 'cleaner-done') {
            next[ev.cleanerId] = {
              ...next[ev.cleanerId],
              status: 'done',
              items: ev.items,
              ms: ev.ms,
            };
          } else if (ev.type === 'cleaner-error') {
            next[ev.cleanerId] = { ...next[ev.cleanerId], status: 'error', error: ev.error };
          }
          return next;
        });
      });
      onComplete(items);
    })();
  }, []);

  return h(Box, { flexDirection: 'column' },
    h(Text, { bold: true, color: 'cyan' }, '  Scanning…'),
    h(Newline),
    ...cleaners.map((c) => {
      const s = states[c.id];
      const total = (s.items || []).reduce((acc, i) => acc + (i.bytes || 0), 0);
      const count = (s.items || []).length;
      let icon;
      if (s.status === 'running') icon = h(Spinner);
      else if (s.status === 'done') icon = h(Text, { color: count > 0 ? 'green' : 'gray' }, count > 0 ? '✓' : '·');
      else if (s.status === 'error') icon = h(Text, { color: 'red' }, '✗');
      else icon = h(Text, { color: 'gray' }, '○');

      return h(Box, { key: c.id },
        h(Text, null, '   '),
        icon,
        h(Text, null, '  '),
        h(Text, { color: s.status === 'done' && count > 0 ? 'white' : 'gray' }, c.label.padEnd(30)),
        h(Text, null, '  '),
        s.status === 'done' && count > 0
          ? h(React.Fragment, null,
              h(SizeText, { bytes: total, width: 10 }),
              h(Text, { color: 'gray' }, `  ${count} item${count === 1 ? '' : 's'}`),
            )
          : s.status === 'error'
            ? h(Text, { color: 'red' }, s.error)
            : h(Text, { color: 'gray' }, s.status === 'running' ? 'scanning…' : ''),
      );
    }),
  );
}

// ─── Results screen ───────────────────────────────────────────────────────────

function ResultsScreen({ items, onStartClean, onQuit }) {
  // Group by cleaner. Pre-select safe+moderate items.
  const { groups, flatIndex } = useMemo(() => {
    const byCleaner = new Map();
    for (const item of items) {
      if (!byCleaner.has(item.cleanerId)) {
        byCleaner.set(item.cleanerId, { id: item.cleanerId, label: item.cleanerLabel, items: [] });
      }
      byCleaner.get(item.cleanerId).items.push(item);
    }
    const groups = [...byCleaner.values()];
    const flatIndex = [];
    for (const g of groups) for (const it of g.items) flatIndex.push(it);
    return { groups, flatIndex };
  }, [items]);

  const initialSelected = useMemo(() => {
    const s = new Set();
    for (const it of flatIndex) if (it.risk !== 'careful' && (it.bytes || 0) > 0) s.add(it.id);
    return s;
  }, [flatIndex]);

  const [selected, setSelected] = useState(initialSelected);
  const [cursor, setCursor] = useState(0);
  const [dryRun, setDryRun] = useState(ARG.dryRun);

  const maxBytes = useMemo(() => Math.max(...flatIndex.map((i) => i.bytes || 0), 1), [flatIndex]);
  const totalSelected = useMemo(() => {
    let total = 0;
    for (const it of flatIndex) if (selected.has(it.id)) total += it.bytes || 0;
    return total;
  }, [flatIndex, selected]);

  useInput((input, key) => {
    if (key.escape || input === 'q') return onQuit();
    if (key.upArrow || input === 'k') setCursor((c) => Math.max(0, c - 1));
    if (key.downArrow || input === 'j') setCursor((c) => Math.min(flatIndex.length - 1, c + 1));
    if (input === ' ') {
      const cur = flatIndex[cursor];
      if (!cur) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(cur.id)) next.delete(cur.id); else next.add(cur.id);
        return next;
      });
    }
    if (input === 'a') {
      const s = new Set();
      for (const it of flatIndex) if ((it.bytes || 0) > 0 || it.command) s.add(it.id);
      setSelected(s);
    }
    if (input === 'n') setSelected(new Set());
    if (input === 's') {
      const s = new Set();
      for (const it of flatIndex) if (it.risk === 'safe' && (it.bytes || 0) > 0) s.add(it.id);
      setSelected(s);
    }
    if (input === 'm') {
      const s = new Set();
      for (const it of flatIndex) if (it.risk !== 'careful' && (it.bytes || 0) > 0) s.add(it.id);
      setSelected(s);
    }
    if (input === 'd') setDryRun((v) => !v);
    if (key.return) {
      const picks = flatIndex.filter((i) => selected.has(i.id));
      if (picks.length > 0) onStartClean(picks, { dryRun });
    }
  });

  if (items.length === 0) {
    return h(Box, { flexDirection: 'column' },
      h(Text, { color: 'gray' }, '  Nothing reclaimable found.'),
      h(Newline),
      h(Text, { color: 'gray' }, '  Press q to quit.'),
    );
  }

  // Windowed view: show ~20 items around cursor.
  const WINDOW = 20;
  const start = Math.max(0, Math.min(cursor - Math.floor(WINDOW / 2), flatIndex.length - WINDOW));
  const end = Math.min(flatIndex.length, start + WINDOW);

  // Build the visible list, but keep group headers.
  const rows = [];
  let lastCleaner = null;
  for (let i = start; i < end; i++) {
    const it = flatIndex[i];
    if (it.cleanerId !== lastCleaner) {
      const group = groups.find((g) => g.id === it.cleanerId);
      const groupTotal = group.items.reduce((s, x) => s + (x.bytes || 0), 0);
      rows.push(h(Box, { key: `hdr-${it.cleanerId}-${i}`, marginTop: 1 },
        h(Text, { color: 'blue', bold: true }, `  ${group.label}`),
        h(Text, { color: 'gray' }, `  (${formatBytes(groupTotal)})`),
      ));
      lastCleaner = it.cleanerId;
    }
    const isCursor = i === cursor;
    const checked = selected.has(it.id);
    rows.push(h(Box, { key: `row-${it.id}-${i}` },
      h(Text, { color: isCursor ? 'cyan' : 'gray' }, isCursor ? '  ▶ ' : '    '),
      h(Text, { color: checked ? 'cyan' : 'gray' }, checked ? '[✓] ' : '[ ] '),
      h(Text, { color: isCursor ? 'white' : undefined }, (it.label || '').padEnd(44).slice(0, 44)),
      h(Text, null, '  '),
      h(Bar, { bytes: it.bytes || 0, max: maxBytes, width: 14 }),
      h(Text, null, '  '),
      h(SizeText, { bytes: it.bytes || 0, width: 10 }),
      h(Text, { color: 'gray' }, '  ['),
      h(Text, { color: RISK_COLOR[it.risk] || 'gray' }, it.risk),
      h(Text, { color: 'gray' }, ']'),
    ));
  }

  const cursorItem = flatIndex[cursor];

  return h(Box, { flexDirection: 'column' },
    h(Box, { flexDirection: 'column' },
      h(Text, { bold: true, color: 'cyan' }, `  ${items.length} reclaimable items found`),
      h(Box, null,
        h(Text, { color: 'gray' }, '  Selected: '),
        h(Text, { color: 'cyan', bold: true }, `${selected.size}`),
        h(Text, { color: 'gray' }, '  →  '),
        h(SizeText, { bytes: totalSelected }),
        dryRun && h(Text, { color: 'yellow' }, '   [DRY-RUN]'),
      ),
    ),
    ...rows,
    h(Box, { marginTop: 1, flexDirection: 'column' },
      cursorItem && cursorItem.description && h(Box, null,
        h(Text, { color: 'gray' }, '  ℹ '),
        h(Text, { color: 'gray', italic: true }, cursorItem.description),
      ),
      cursorItem && cursorItem.path && h(Box, null,
        h(Text, { color: 'gray' }, '  ↳ '),
        h(Text, { color: 'gray' }, cursorItem.path),
      ),
      cursorItem && cursorItem.paths && h(Box, null,
        h(Text, { color: 'gray' }, '  ↳ '),
        h(Text, { color: 'gray' }, `${cursorItem.paths.length} locations`),
      ),
      cursorItem && cursorItem.command && h(Box, null,
        h(Text, { color: 'gray' }, '  $ '),
        h(Text, { color: 'gray' }, cursorItem.command),
      ),
    ),
    h(Box, { marginTop: 1, flexDirection: 'column' },
      h(Box, null,
        h(Text, { color: 'cyan', bold: true }, '  [space]'),
        h(Text, { color: 'gray' }, ' toggle   '),
        h(Text, { color: 'cyan', bold: true }, '[↑/↓]'),
        h(Text, { color: 'gray' }, ' move   '),
        h(Text, { color: 'cyan', bold: true }, '[⏎]'),
        h(Text, { color: 'gray' }, ' clean selected   '),
        h(Text, { color: 'cyan', bold: true }, '[q]'),
        h(Text, { color: 'gray' }, ' quit'),
      ),
      h(Box, null,
        h(Text, { color: 'gray' }, '  presets: '),
        h(Text, { color: 'cyan' }, '[a]'),
        h(Text, { color: 'gray' }, ' all  '),
        h(Text, { color: 'cyan' }, '[n]'),
        h(Text, { color: 'gray' }, ' none  '),
        h(Text, { color: 'cyan' }, '[s]'),
        h(Text, { color: 'gray' }, ' safe-only  '),
        h(Text, { color: 'cyan' }, '[m]'),
        h(Text, { color: 'gray' }, ' safe+moderate  '),
        h(Text, { color: 'cyan' }, '[d]'),
        h(Text, { color: 'gray' }, ' dry-run toggle'),
      ),
    ),
    start > 0 && h(Text, { color: 'gray' }, `  … ${start} items above`),
    end < flatIndex.length && h(Text, { color: 'gray' }, `  … ${flatIndex.length - end} items below`),
  );
}

// ─── Confirm screen ───────────────────────────────────────────────────────────

function ConfirmScreen({ items, dryRun, onConfirm, onCancel }) {
  const total = items.reduce((s, i) => s + (i.bytes || 0), 0);
  const careful = items.filter((i) => i.risk === 'careful');

  useInput((input, key) => {
    if (key.return) onConfirm();
    if (key.escape || input === 'q' || input === 'n') onCancel();
  });

  return h(Box, { flexDirection: 'column', marginTop: 1 },
    h(Text, { bold: true, color: dryRun ? 'yellow' : 'cyan' },
      `  ${dryRun ? '⚠  Dry-run preview' : '⚠  Confirm cleanup'}`,
    ),
    h(Newline),
    h(Box, null,
      h(Text, null, '  About to '),
      h(Text, { bold: true, color: dryRun ? 'yellow' : 'red' }, dryRun ? 'preview ' : 'permanently delete '),
      h(Text, { bold: true, color: 'cyan' }, `${items.length} item${items.length === 1 ? '' : 's'}`),
      h(Text, null, ' — freeing '),
      h(SizeText, { bytes: total }),
    ),
    careful.length > 0 && h(Box, { marginTop: 1, flexDirection: 'column' },
      h(Text, { color: 'red', bold: true }, `  ⚠  Includes ${careful.length} "careful" item${careful.length === 1 ? '' : 's'}:`),
      ...careful.slice(0, 5).map((it, i) =>
        h(Box, { key: `c-${i}` },
          h(Text, { color: 'red' }, '     • '),
          h(Text, null, it.label),
        ),
      ),
      careful.length > 5 && h(Text, { color: 'red' }, `     … and ${careful.length - 5} more`),
    ),
    dryRun && h(Box, { marginTop: 1 },
      h(Text, { color: 'yellow' }, '  [DRY-RUN MODE] '),
      h(Text, { color: 'gray' }, 'nothing will actually be deleted.'),
    ),
    h(Newline),
    h(Box, null,
      h(Text, { color: 'green', bold: true }, '  [⏎]'),
      h(Text, { color: 'gray' }, dryRun ? ' run preview     ' : ' confirm + delete     '),
      h(Text, { color: 'red', bold: true }, '[ESC/q/n]'),
      h(Text, { color: 'gray' }, ' cancel, go back'),
    ),
  );
}

// ─── Cleaning screen ──────────────────────────────────────────────────────────

function CleanScreen({ items, dryRun, onDone }) {
  const [progress, setProgress] = useState({ index: 0, current: null, results: [], freed: 0 });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      await cleanItems(items, {
        dryRun,
        onEvent: (ev) => {
          if (ev.type === 'item-start') {
            setProgress((p) => ({ ...p, current: ev.item }));
          } else if (ev.type === 'item-done') {
            setProgress((p) => ({
              index: p.index + 1,
              current: null,
              freed: p.freed + (ev.freed || 0),
              results: [...p.results, { item: ev.item, freed: ev.freed, ok: ev.ok }],
            }));
          }
        },
      });
      setTimeout(onDone, 300);
    })();
  }, []);

  return h(Box, { flexDirection: 'column' },
    h(Text, { bold: true, color: 'cyan' }, `  ${dryRun ? 'Previewing' : 'Cleaning'}…`),
    h(Newline),
    h(Box, null,
      h(Text, null, '  '),
      h(ProgressBar, { value: progress.index, total: items.length, width: 30 }),
      h(Text, null, `  ${progress.index}/${items.length}`),
    ),
    h(Box, { marginTop: 1 },
      h(Text, null, '  freed so far: '),
      h(SizeText, { bytes: progress.freed }),
    ),
    progress.current && h(Box, { marginTop: 1 },
      h(Spinner),
      h(Text, null, '  '),
      h(Text, { color: 'cyan' }, progress.current.label),
    ),
    h(Box, { marginTop: 1, flexDirection: 'column' },
      ...progress.results.slice(-8).map((r, i) =>
        h(Box, { key: `${r.item.id}-${i}` },
          h(Text, { color: r.ok ? 'green' : 'red' }, r.ok ? '  ✓ ' : '  ✗ '),
          h(Text, null, (r.item.label || '').padEnd(44).slice(0, 44)),
          h(Text, null, '  '),
          h(SizeText, { bytes: r.freed }),
        ),
      ),
    ),
  );
}

// ─── Done screen ──────────────────────────────────────────────────────────────

function DoneScreen({ freed, dryRun, onExit }) {
  useInput((input, key) => { if (key.escape || key.return || input === 'q') onExit(); });
  return h(Box, { flexDirection: 'column', marginTop: 1 },
    h(Box, null,
      h(Text, { color: 'green', bold: true }, '  ✨ '),
      h(Text, { bold: true }, dryRun ? 'Would free: ' : 'Freed: '),
      h(SizeText, { bytes: freed }),
    ),
    h(Newline),
    h(Text, { color: 'gray' }, '  Press ⏎ / q to exit.'),
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState('scan');
  const [items, setItems] = useState([]);
  const [clean, setClean] = useState(null);
  const [freed, setFreed] = useState(0);

  return h(Box, { flexDirection: 'column', paddingY: 1 },
    h(Banner),
    screen === 'scan' && h(ScanScreen, {
      onComplete: (scanned) => {
        setItems(scanned.filter((i) => (i.bytes || 0) > 0 || i.command));
        setScreen('results');
      },
    }),
    screen === 'results' && h(ResultsScreen, {
      items,
      onStartClean: (picks, opts) => {
        setClean({ picks, dryRun: opts.dryRun });
        setScreen('confirm');
      },
      onQuit: () => exit(),
    }),
    screen === 'confirm' && clean && h(ConfirmScreen, {
      items: clean.picks,
      dryRun: clean.dryRun,
      onConfirm: () => setScreen('cleaning'),
      onCancel: () => { setClean(null); setScreen('results'); },
    }),
    screen === 'cleaning' && clean && h(CleanScreen, {
      items: clean.picks,
      dryRun: clean.dryRun,
      onDone: () => {
        const total = clean.picks.reduce((s, i) => s + (i.bytes || 0), 0);
        setFreed(total);
        setScreen('done');
      },
    }),
    screen === 'done' && h(DoneScreen, {
      freed,
      dryRun: clean?.dryRun,
      onExit: () => exit(),
    }),
  );
}

render(h(App));
