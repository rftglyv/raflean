import { execSync, spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';

export function sh(cmd, { timeout = 15000 } = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
    }).trim();
  } catch {
    return null;
  }
}

export function has(bin) {
  return sh(`command -v ${bin}`) !== null;
}

export function exists(path) {
  if (!path) return false;
  try {
    return existsSync(path);
  } catch {
    return false;
  }
}

export function dirSize(path) {
  if (!exists(path)) return 0;
  const out = sh(`du -sk "${path.replace(/"/g, '\\"')}" 2>/dev/null | awk '{print $1}'`);
  const kb = out ? parseInt(out, 10) : 0;
  return Number.isFinite(kb) ? kb * 1024 : 0;
}

export function dirSizeAsync(path) {
  return new Promise((resolve) => {
    if (!exists(path)) return resolve(0);
    const p = spawn('du', ['-sk', path], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => {
      p.kill('SIGKILL');
      resolve(0);
    }, 60000);
    p.stdout.on('data', (d) => { out += d.toString(); });
    p.on('close', () => {
      clearTimeout(timer);
      const kb = parseInt(out.trim().split(/\s+/)[0], 10);
      resolve(Number.isFinite(kb) ? kb * 1024 : 0);
    });
    p.on('error', () => { clearTimeout(timer); resolve(0); });
  });
}

export function rm(path) {
  if (!exists(path)) return false;
  try {
    rmSync(path, { recursive: true, force: true });
    return true;
  } catch {
    // fallback via shell (handles some permission quirks)
    return sh(`rm -rf "${path.replace(/"/g, '\\"')}"`) !== null;
  }
}

export function runCmd(cmd, { timeout = 120000 } = {}) {
  try {
    execSync(cmd, { stdio: ['ignore', 'ignore', 'ignore'], timeout });
    return true;
  } catch {
    return false;
  }
}

export function safeReaddir(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

export function walk(baseDir, { match, skipNames = [], maxDepth = 5 } = {}) {
  const results = [];
  if (!exists(baseDir)) return results;

  function recurse(dir, depth) {
    if (depth > maxDepth) return;
    for (const entry of safeReaddir(dir)) {
      if (!entry.isDirectory()) continue;
      if (skipNames.includes(entry.name)) continue;
      const full = join(dir, entry.name);
      if (match(entry.name, full)) {
        results.push(full);
        continue;
      }
      if (entry.name.startsWith('.') && entry.name !== '.config') continue;
      recurse(full, depth + 1);
    }
  }
  recurse(baseDir, 0);
  return results;
}

export function mtimeDays(path) {
  try {
    const s = statSync(path);
    return (Date.now() - s.mtimeMs) / 86400000;
  } catch {
    return 0;
  }
}

export function diskUsage() {
  const raw = sh('df -k / | tail -1');
  if (!raw) return null;
  const parts = raw.split(/\s+/);
  const total = parseInt(parts[1], 10) * 1024;
  const used = parseInt(parts[2], 10) * 1024;
  const free = parseInt(parts[3], 10) * 1024;
  if (!Number.isFinite(total)) return null;
  return { total, used, free };
}
