# raflean

[![npm](https://img.shields.io/npm/v/raflean?color=cb3837&label=npm)](https://www.npmjs.com/package/raflean)
[![license](https://img.shields.io/npm/l/raflean?color=blue)](./LICENSE)
[![downloads](https://img.shields.io/npm/dm/raflean?color=7aa2f7)](https://www.npmjs.com/package/raflean)

> Universal storage cleaner for developers. One command, reclaim gigabytes from every dev-tool cache on your machine.

```
 ██████╗  █████╗ ███████╗██╗     ███████╗ █████╗ ███╗   ██╗
 ██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝██╔══██╗████╗  ██║
 ██████╔╝███████║█████╗  ██║     █████╗  ███████║██╔██╗ ██║
 ██╔══██╗██╔══██║██╔══╝  ██║     ██╔══╝  ██╔══██║██║╚██╗██║
 ██║  ██║██║  ██║██║     ███████╗███████╗██║  ██║██║ ╚████║
 ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝
```

Two interfaces, one core:

- **`raflean`** — fast plain CLI. Zero runtime deps. Compiles to a ~60 MB standalone binary via `bun --compile`.
- **`raflean-ui`** — rich interactive TUI built with [Ink](https://github.com/vadimdemedes/ink). Arrow-key nav, live selection, dry-run toggle, grouped results.

## Quick start

**Via npm / npx** (works on every platform with Node ≥ 18):

```bash
npx raflean                    # scan + report
npx raflean clean --dry-run    # preview what would be deleted
npx raflean clean --all        # clean all safe + moderate
npx raflean-ui                 # rich interactive TUI

# Or install globally:
npm install -g raflean
```

**Via prebuilt binary** (Apple Silicon — M1/M2/M3/M4 — only):

```bash
curl -L https://github.com/rftglyv/raflean/releases/latest/download/raflean-darwin-arm64 \
  -o /usr/local/bin/raflean && chmod +x /usr/local/bin/raflean
curl -L https://github.com/rftglyv/raflean/releases/latest/download/raflean-ui-darwin-arm64 \
  -o /usr/local/bin/raflean-ui && chmod +x /usr/local/bin/raflean-ui
```

**Intel Macs, Linux, or anything else** — compile from source (takes ~5 seconds with [Bun](https://bun.sh)):

```bash
git clone https://github.com/rftglyv/raflean && cd raflean
bun install
bun build bin/raflean.js    --compile --outfile raflean
bun build bin/raflean-ui.js --compile --outfile raflean-ui
sudo mv raflean raflean-ui /usr/local/bin/
```

Bun cross-compiles to any target via `--target=bun-<os>-<arch>`:
`bun-darwin-arm64`, `bun-darwin-x64`, `bun-linux-x64`, `bun-linux-arm64`, `bun-windows-x64`.

## What it scans

13 cleaner modules covering **50+ targets**:

| Area | Targets |
|---|---|
| **Node** | npm · npx · yarn v1/berry · pnpm · bun · node-gyp · corepack · Electron · Cypress · Puppeteer · Playwright · nvm |
| **Docker** | reclaimable images · containers · volumes · builder cache |
| **Homebrew** | download cache · outdated formula versions |
| **Python** | pip · pipx · Poetry · uv · Conda · HuggingFace · PyTorch hub · mypy · pytest · ruff |
| **Rust** | Cargo registry cache/src · git db/checkouts · sccache |
| **Go** | build cache · module cache |
| **JVM** | Gradle · Maven · sbt · Coursier · Ivy |
| **Ruby** | Bundler · RubyGems · CocoaPods |
| **Xcode** | DerivedData · Archives · iOS/watchOS/tvOS DeviceSupport · SwiftPM · unavailable simulators |
| **Editors** | VS Code · VS Code Insiders · Cursor · Windsurf · Zed · JetBrains · Sublime · Neovim |
| **macOS** | Trash · user logs · crash reports · QuickLook · Saved App State · iOS backups · Library/Caches |
| **Browsers** | Chrome · Chrome Canary · Chromium · Brave · Edge · Arc · Firefox · Safari |
| **Projects** | `node_modules` + build artifacts (`.next`, `.nuxt`, `.turbo`, `dist`, `target`, `.astro`, `.vercel`, …) across common project directories |

Each item has a **risk tier**:

- **safe** — regenerates automatically (npm cache, DerivedData, build artifacts)
- **moderate** — recoverable but disruptive (user logs, Maven repo, iOS DeviceSupport)
- **careful** — has user data or is hard to regenerate (Trash, iOS backups, browser caches, Xcode Archives)

`--all` auto-selects safe + moderate. Careful items require explicit opt-in via `--only=<id>`.

## Usage

```bash
raflean                               # diagnose (default)
raflean diagnose --json               # machine-readable
raflean diagnose --only=node,docker   # restrict to specific cleaners

raflean clean                         # interactive
raflean clean --dry-run               # preview only
raflean clean --all                   # clean all safe + moderate
raflean clean --only=python --all     # clean one category without prompts

raflean help
raflean-ui                            # launch the interactive TUI
```

## Architecture

```
src/core/                  ← zero-dep shared library
  platform.js              ← HOME + XDG path resolution
  shell.js                 ← sh(), du, walk, rm, disk usage
  format.js                ← byte formatting + ANSI colors
  runner.js                ← scanAll() + cleanItems() with progress events
  registry.js              ← imports & exports all cleaners
  cleaners/                ← one plug-in per scope
    node.js  docker.js  homebrew.js  python.js  rust.js
    go.js    java.js    ruby.js      xcode.js   editors.js
    macos.js browsers.js projects.js

bin/
  raflean.js               ← plain CLI. Imports src/core only.
  raflean-ui.js            ← Ink TUI. Imports src/core + ink/react.
```

**Adding a cleaner** takes ~30 lines:

```js
// src/core/cleaners/yourthing.js
import { dirSizeAsync, exists } from '../shell.js';
import { home } from '../platform.js';

export default {
  id: 'yourthing',
  label: 'Your thing',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    const path = home('.yourthing', 'cache');
    if (!exists(path)) return [];
    return [{
      id: 'yourthing-cache',
      label: 'Your thing cache',
      path,
      bytes: await dirSizeAsync(path),
    }];
  },
};
```

Register it in `src/core/registry.js`. Both the plain CLI and the TUI pick it up automatically.

## Build from source

```bash
make install           # install deps
make scan              # quick diagnose
make preview           # dry-run clean
make build             # bun compile → dist/raflean + dist/raflean-ui
make install-global    # copy to /usr/local/bin (override with PREFIX=...)
make help              # everything else
```

Tests run with bun:

```bash
bun test
```

## How this was built

raflean is built collaboratively by **[raffy (rftglyv)](https://github.com/rftglyv)** and **Claude** (Anthropic), using Claude Code as the development environment. The architecture, the cleaner-plugin registry, the Ink TUI, the dual-binary split — every piece came out of conversational iteration between human judgment and AI implementation.

It's the first in a planned series of tools built this way. The pattern — small team, AI collaboration, focused scope, production quality — is the interesting part; raflean is the proof of concept.

The commit history is intentionally granular so you can see how the collaboration unfolded.

## Contributing

**Contributions welcome and wanted.** Especially:

- **New cleaner modules** — drop a file in `src/core/cleaners/`, PR open. More coverage = more value to more devs.
- **Linux hardening** — primary testing is on macOS. Linux fallbacks exist but need real-world validation.
- **Windows support** — not yet attempted. Would roughly mean a Windows-specific `platform.js` + new cleaners for `%LOCALAPPDATA%`, WSL paths, etc.
- **Safety improvements** — better heuristics for which caches are truly safe to nuke, better risk tagging.
- **Distribution** — Homebrew formula, Scoop manifest, apt repo, AUR package.
- **Docs & translations** — the more accessible, the better.

Open an issue first for anything larger than a single cleaner. PRs should include a brief description and, if touching `src/core/`, a test in `test/core.test.js`.

## Roadmap

- [ ] Publish to npm (direct `npx raflean`)
- [ ] Homebrew tap (`brew install rftglyv/tap/raflean`)
- [ ] Windows support
- [ ] `raflean schedule` — launchd/cron hook for weekly auto-scans
- [ ] Per-project `.raflean.yml` config
- [ ] Markdown / HTML report export
- [ ] Plugin hook API for third-party cleaners

## License

MIT © raffy (rftglyv) and contributors.
