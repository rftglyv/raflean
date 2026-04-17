#!/usr/bin/env node
/**
 * raflean — universal macOS/Linux storage cleaner for developers.
 * Zero-dep plain CLI. Paired with bin/raflean-ui.js (Ink TUI).
 */

import readline from 'node:readline';
import { allCleaners, getCleaner } from '../src/core/registry.js';
import { scanAll, cleanItems } from '../src/core/runner.js';
import { diskUsage } from '../src/core/shell.js';
import { c, formatBytes, bar, sizeColor, riskColor, RISK_LABEL } from '../src/core/format.js';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isAll = args.includes('--all') || args.includes('--yes');
const isJson = args.includes('--json');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice('--only='.length).split(',') : null;
const command = args.find((a) => !a.startsWith('--')) || 'diagnose';

function title(str) {
  process.stdout.write(`\n  ${c.bold}${c.cyan}${str}${c.reset}\n`);
}

function progress(text) {
  if (!process.stdout.isTTY) return;
  process.stdout.write(`\r\x1b[K  ${c.gray}${text}${c.reset}`);
}

function clearProgress() {
  if (!process.stdout.isTTY) return;
  process.stdout.write('\r\x1b[K');
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (a) => { rl.close(); resolve(a.trim().toLowerCase()); }));
}

function banner() {
  const lines = [
    '  ██████╗  █████╗ ███████╗██╗     ███████╗ █████╗ ███╗   ██╗',
    '  ██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝██╔══██╗████╗  ██║',
    '  ██████╔╝███████║█████╗  ██║     █████╗  ███████║██╔██╗ ██║',
    '  ██╔══██╗██╔══██║██╔══╝  ██║     ██╔══╝  ██╔══██║██║╚██╗██║',
    '  ██║  ██║██║  ██║██║     ███████╗███████╗██║  ██║██║ ╚████║',
    '  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝',
  ];
  for (const l of lines) console.log(c.bold + c.cyan + l + c.reset);
  console.log(c.gray + '  Universal storage cleaner for developers — by raffy\n' + c.reset);
}

async function scan() {
  let cleaners = allCleaners();
  if (only) cleaners = cleaners.filter((cl) => only.includes(cl.id));

  const seen = new Set();
  const items = await scanAll(cleaners, (ev) => {
    if (ev.type === 'cleaner-start') {
      progress(`scanning ${ev.label}…`);
    } else if (ev.type === 'cleaner-done') {
      seen.add(ev.cleanerId);
      const remaining = cleaners.length - seen.size;
      progress(remaining > 0 ? `${remaining} cleaner${remaining === 1 ? '' : 's'} remaining…` : '');
    } else if (ev.type === 'cleaner-error') {
      clearProgress();
      console.error(c.red + `  ! ${ev.cleanerId}: ${ev.error}` + c.reset);
    }
  });
  clearProgress();
  return items;
}

function renderReport(items) {
  if (items.length === 0) {
    console.log(c.gray + '  Nothing reclaimable found.' + c.reset);
    return;
  }

  const maxBytes = Math.max(...items.map((i) => i.bytes || 0), 1);
  const byCleaner = new Map();
  for (const item of items) {
    if (!byCleaner.has(item.cleanerId)) byCleaner.set(item.cleanerId, { label: item.cleanerLabel, items: [] });
    byCleaner.get(item.cleanerId).items.push(item);
  }

  for (const [id, group] of byCleaner) {
    const total = group.items.reduce((s, i) => s + (i.bytes || 0), 0);
    console.log(`\n  ${c.bold}${c.blue}${group.label}${c.reset}  ${c.gray}(${formatBytes(total)})${c.reset}`);
    for (const item of group.items) {
      const label = item.label.padEnd(45).slice(0, 45);
      const size = sizeColor(item.bytes) + formatBytes(item.bytes).padStart(10) + c.reset;
      const b = bar(item.bytes, maxBytes, 16);
      const risk = riskColor(item.risk) + RISK_LABEL[item.risk] + c.reset;
      console.log(`    ${c.gray}${label}${c.reset}  ${b}  ${size}  ${c.gray}[${c.reset}${risk}${c.gray}]${c.reset}`);
    }
  }
}

async function cmdDiagnose() {
  banner();
  const disk = diskUsage();
  if (disk) {
    const pct = Math.round((disk.used / disk.total) * 100);
    const width = 40;
    const fill = Math.round((disk.used / disk.total) * width);
    const col = pct > 85 ? c.red + c.bold : pct > 70 ? c.yellow : c.green;
    console.log(`  ${c.bold}Disk${c.reset}  ${col}${'█'.repeat(fill)}${c.gray}${'░'.repeat(width - fill)}${c.reset}  ${col}${pct}%${c.reset}  ${c.gray}${formatBytes(disk.free)} free of ${formatBytes(disk.total)}${c.reset}`);
  }
  console.log();
  title('Scanning…');
  const items = await scan();

  if (isJson) {
    const out = items.map((i) => ({
      id: i.id,
      cleanerId: i.cleanerId,
      label: i.label,
      bytes: i.bytes,
      risk: i.risk,
      path: i.path,
      paths: i.paths,
      command: i.command,
      description: i.description,
    }));
    const total = items.reduce((s, i) => s + (i.bytes || 0), 0);
    process.stdout.write(JSON.stringify({ total, items: out }, null, 2) + '\n');
    return items;
  }

  renderReport(items);
  const total = items.reduce((s, i) => s + (i.bytes || 0), 0);
  console.log(`\n  ${c.bold}Total reclaimable:${c.reset}  ${sizeColor(total)}${formatBytes(total)}${c.reset}\n`);
  console.log(`  ${c.gray}Run ${c.reset}${c.cyan}raflean clean${c.reset}${c.gray} to clean interactively, or ${c.reset}${c.cyan}raflean-ui${c.reset}${c.gray} for the TUI.${c.reset}\n`);
  return items;
}

async function cmdClean() {
  const items = await cmdDiagnose();
  if (!items || items.length === 0) return;

  if (isDryRun) {
    console.log(`  ${c.yellow}⚠  DRY RUN — nothing will be deleted${c.reset}\n`);
  }

  let toClean = [];
  if (isAll) {
    // Only auto-clean safe + moderate. Careful needs explicit --only=<id>.
    toClean = items.filter((i) => i.risk !== 'careful' && (i.bytes || 0) > 0);
    if (items.some((i) => i.risk === 'careful')) {
      console.log(`  ${c.yellow}Skipping 'careful' items. Use --only=<id> to include them.${c.reset}\n`);
    }
  } else {
    for (const item of items) {
      if ((item.bytes || 0) === 0 && !item.command) continue;
      const riskTag = riskColor(item.risk) + RISK_LABEL[item.risk] + c.reset;
      const sz = formatBytes(item.bytes);
      const ans = await ask(`  Clean ${c.bold}${item.label}${c.reset} ${c.gray}(${sz}, ${riskTag}${c.gray})${c.reset}? [y/n/a=all/q=quit] `);
      if (ans === 'q') { console.log(c.gray + '  Quit.' + c.reset); break; }
      if (ans === 'a') { toClean = items.filter((i) => i.risk !== 'careful' && (i.bytes || 0) > 0); break; }
      if (ans === 'y') toClean.push(item);
    }
  }

  if (toClean.length === 0) {
    console.log(`\n  ${c.gray}Nothing selected.${c.reset}\n`);
    return;
  }

  console.log();
  const results = [];
  const { totalFreed } = await cleanItems(toClean, {
    dryRun: isDryRun,
    onEvent: (ev) => {
      if (ev.type === 'item-start') {
        progress(`cleaning ${ev.item.label}…`);
      } else if (ev.type === 'item-done') {
        clearProgress();
        const mark = ev.ok ? c.green + '✓' : c.red + '✗';
        const freed = isDryRun ? c.gray + '(dry-run) ' + c.reset : '';
        console.log(`  ${mark}${c.reset} ${ev.item.label.padEnd(45).slice(0, 45)}  ${freed}${formatBytes(ev.freed)}`);
        results.push(ev);
      }
    },
  });

  // Final summary — grouped by cleaner
  const succeeded = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const label = isDryRun ? 'Would free' : 'Freed';
  const divider = '─'.repeat(62);

  console.log(`\n  ${c.gray}${divider}${c.reset}`);
  console.log(`  ${c.bold}${c.green}✨ ${label}: ${formatBytes(totalFreed)}${c.reset}  ${c.gray}(${succeeded.length} item${succeeded.length === 1 ? '' : 's'}${failed.length ? `, ${c.red}${failed.length} failed${c.reset}${c.gray}` : ''})${c.reset}`);

  if (succeeded.length > 0) {
    const byCleaner = new Map();
    for (const r of succeeded) {
      const key = r.item.cleanerLabel || 'Other';
      if (!byCleaner.has(key)) byCleaner.set(key, []);
      byCleaner.get(key).push(r);
    }
    for (const [cleaner, rs] of byCleaner) {
      const total = rs.reduce((s, r) => s + (r.freed || 0), 0);
      console.log(`\n  ${c.bold}${c.blue}${cleaner}${c.reset}  ${c.gray}(${formatBytes(total)})${c.reset}`);
      for (const r of rs) {
        const name = (r.item.label || '').padEnd(42).slice(0, 42);
        console.log(`    ${c.green}✓${c.reset} ${c.gray}${name}${c.reset}  ${formatBytes(r.freed).padStart(10)}`);
      }
    }
  }

  if (failed.length > 0) {
    console.log(`\n  ${c.red}${c.bold}${failed.length} item${failed.length === 1 ? '' : 's'} failed:${c.reset}`);
    for (const r of failed) {
      console.log(`    ${c.red}✗${c.reset} ${r.item.label}`);
    }
  }

  console.log();
}

function showHelp() {
  console.log(`
  ${c.bold + c.cyan}raflean${c.reset} — universal storage cleaner for developers

  ${c.bold}USAGE${c.reset}
    raflean [command] [options]

  ${c.bold}COMMANDS${c.reset}
    ${c.cyan}diagnose${c.reset}   Scan and report (default)
    ${c.cyan}clean${c.reset}      Clean interactively (or with --all / --only)
    ${c.cyan}help${c.reset}       Show this help

  ${c.bold}OPTIONS${c.reset}
    ${c.cyan}--dry-run${c.reset}         Preview without deleting
    ${c.cyan}--all, --yes${c.reset}      Clean all non-'careful' items without prompting
    ${c.cyan}--only=id1,id2${c.reset}    Limit to specific cleaners (e.g. node,docker,xcode)
    ${c.cyan}--json${c.reset}            Emit structured JSON from diagnose (for scripts)

  ${c.bold}CLEANER IDS${c.reset}
    ${allCleaners().map((cl) => c.cyan + cl.id + c.reset).join(', ')}

  ${c.bold}EXAMPLES${c.reset}
    raflean
    raflean clean --dry-run
    raflean clean --only=node,docker --all
    raflean diagnose --json

  ${c.bold}INTERACTIVE TUI${c.reset}
    raflean-ui     ${c.gray}# rich Ink-based interface${c.reset}
`);
}

(async () => {
  switch (command) {
    case 'diagnose': await cmdDiagnose(); break;
    case 'clean':    await cmdClean();    break;
    case 'help':
    case '--help':
    case '-h':       showHelp(); break;
    default:
      console.log(c.red + `  Unknown command: ${command}` + c.reset);
      showHelp();
      process.exit(1);
  }
})().catch((err) => {
  console.error(c.red + '  Error: ' + err.message + c.reset);
  process.exit(1);
});
