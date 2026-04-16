import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists, has, sh } from '../shell.js';

export default {
  id: 'python',
  label: 'Python ecosystem',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    const items = [];

    // pip cache
    const pipCache = IS_MAC
      ? macLibrary('Caches', 'pip')
      : join(HOME, '.cache', 'pip');
    if (exists(pipCache)) {
      items.push({
        id: 'pip-cache',
        label: 'pip download cache',
        path: pipCache,
        bytes: await dirSizeAsync(pipCache),
      });
    }

    // pipx shared cache (venvs themselves are real installs — skip)
    const pipxCache = join(HOME, '.local', 'pipx', '.cache');
    if (exists(pipxCache)) {
      items.push({
        id: 'pipx-cache',
        label: 'pipx cache',
        path: pipxCache,
        bytes: await dirSizeAsync(pipxCache),
      });
    }

    // Poetry cache
    const poetryCache = IS_MAC
      ? macLibrary('Caches', 'pypoetry')
      : join(HOME, '.cache', 'pypoetry');
    if (exists(poetryCache)) {
      items.push({
        id: 'poetry-cache',
        label: 'Poetry cache',
        path: poetryCache,
        bytes: await dirSizeAsync(poetryCache),
      });
    }

    // uv cache
    const uvCache = IS_MAC
      ? macLibrary('Caches', 'uv')
      : join(HOME, '.cache', 'uv');
    if (exists(uvCache)) {
      items.push({
        id: 'uv-cache',
        label: 'uv cache',
        path: uvCache,
        bytes: await dirSizeAsync(uvCache),
      });
    }

    // Conda pkgs cache (safe — reinstalls re-download)
    const condaPkgs = [
      join(HOME, 'miniconda3', 'pkgs'),
      join(HOME, 'anaconda3', 'pkgs'),
      join(HOME, 'opt', 'miniconda3', 'pkgs'),
      join(HOME, 'opt', 'anaconda3', 'pkgs'),
    ];
    for (const p of condaPkgs) {
      if (exists(p)) {
        items.push({
          id: `conda-pkgs-${p}`,
          label: `Conda package cache (${p.replace(HOME, '~')})`,
          path: p,
          bytes: await dirSizeAsync(p),
          command: `conda clean --all --yes >/dev/null 2>&1 || true`,
        });
      }
    }

    // HuggingFace cache — can be MASSIVE for ML users
    const hf = IS_MAC
      ? join(HOME, '.cache', 'huggingface')
      : join(HOME, '.cache', 'huggingface');
    if (exists(hf)) {
      const bytes = await dirSizeAsync(hf);
      if (bytes > 0) {
        items.push({
          id: 'huggingface-cache',
          label: 'HuggingFace models cache',
          path: hf,
          bytes,
          risk: 'careful',
          description: 'downloaded models — will re-download (may be large/slow)',
        });
      }
    }

    // PyTorch hub cache
    const torchHub = join(HOME, '.cache', 'torch');
    if (exists(torchHub)) {
      items.push({
        id: 'torch-hub',
        label: 'PyTorch hub cache',
        path: torchHub,
        bytes: await dirSizeAsync(torchHub),
        risk: 'moderate',
      });
    }

    // mypy cache (project-local, but also a user cache)
    const mypy = join(HOME, '.mypy_cache');
    if (exists(mypy)) {
      items.push({
        id: 'mypy-cache',
        label: 'mypy cache',
        path: mypy,
        bytes: await dirSizeAsync(mypy),
      });
    }

    // pytest cache
    const pytest = join(HOME, '.pytest_cache');
    if (exists(pytest)) {
      items.push({
        id: 'pytest-cache',
        label: 'pytest cache',
        path: pytest,
        bytes: await dirSizeAsync(pytest),
      });
    }

    // ruff cache
    const ruff = IS_MAC
      ? macLibrary('Caches', 'ruff')
      : join(HOME, '.cache', 'ruff');
    if (exists(ruff)) {
      items.push({
        id: 'ruff-cache',
        label: 'ruff cache',
        path: ruff,
        bytes: await dirSizeAsync(ruff),
      });
    }

    return items;
  },
};
