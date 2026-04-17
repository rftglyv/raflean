import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOME } from '../platform.js';
import { dirSizeAsync, exists, walk } from '../shell.js';

const NODE_MODULES = 'node_modules';
const BUILD_DIRS = new Set([
  '.next', '.nuxt', '.turbo', '.cache', 'dist', 'out', '.output',
  '.svelte-kit', '.remix', '.astro', '.vercel', '.parcel-cache',
  'build', '.expo', '.docusaurus', '.angular',
]);
const ARTIFACT_NAMES = new Set([...BUILD_DIRS, 'target']);

const CANDIDATE_DIRS = [
  'Developer', 'dev', 'projects', 'Projects', 'code', 'Code',
  'workspace', 'workspaces', 'Desktop', 'Documents', 'Sites', 'repos', 'src',
];

function projectRoots() {
  return CANDIDATE_DIRS
    .map((d) => join(HOME, d))
    .filter(exists);
}

// Protect the node_modules of the currently-running raflean install, and
// the cwd's own node_modules. Prevents raflean from deleting its own deps
// or the deps of the project the user is invoking it from.
function protectedPathsNodeModules() {
  const prot = new Set();
  const marker = `${sep}node_modules${sep}`;
  try {
    const selfPath = fileURLToPath(import.meta.url);
    const idx = selfPath.indexOf(marker);
    if (idx !== -1) prot.add(selfPath.slice(0, idx + marker.length - 1));
  } catch { /* non-file URL */ }
  prot.add(join(process.cwd(), 'node_modules'));
  return prot;
}

export default {
  id: 'projects',
  label: 'Project directories',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    const items = [];
    const roots = projectRoots();
    if (roots.length === 0) return items;

    const protectedPaths = protectedPathsNodeModules();
    const allNodeModules = new Set();
    const allBuilds = new Set();

    for (const root of roots) {
      for (const p of walk(root, {
        maxDepth: 6,
        skipNames: ['Library', 'Applications'],
        match: (name) => name === NODE_MODULES,
      })) {
        if (protectedPaths.has(p)) continue;
        allNodeModules.add(p);
      }
      for (const p of walk(root, {
        maxDepth: 6,
        skipNames: [NODE_MODULES, 'Library', 'Applications'],
        match: (name) => ARTIFACT_NAMES.has(name),
      })) {
        allBuilds.add(p);
      }
    }

    if (allNodeModules.size > 0) {
      const paths = [...allNodeModules];
      let total = 0;
      for (const p of paths) total += await dirSizeAsync(p);
      items.push({
        id: 'project-node-modules',
        label: `node_modules × ${paths.length}`,
        paths,
        bytes: total,
        description: `across ${roots.length} project root(s) — restore with npm/bun/yarn/pnpm install`,
      });
    }

    if (allBuilds.size > 0) {
      const paths = [...allBuilds];
      let total = 0;
      for (const p of paths) total += await dirSizeAsync(p);
      items.push({
        id: 'project-build-artifacts',
        label: `Build artifacts × ${paths.length}`,
        paths,
        bytes: total,
        description: '.next, .nuxt, dist, target, .turbo, .astro, .vercel, etc.',
      });
    }

    return items;
  },
};
