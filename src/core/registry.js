import node from './cleaners/node.js';
import docker from './cleaners/docker.js';
import homebrew from './cleaners/homebrew.js';
import python from './cleaners/python.js';
import rust from './cleaners/rust.js';
import go from './cleaners/go.js';
import java from './cleaners/java.js';
import ruby from './cleaners/ruby.js';
import xcode from './cleaners/xcode.js';
import editors from './cleaners/editors.js';
import macos from './cleaners/macos.js';
import browsers from './cleaners/browsers.js';
import projects from './cleaners/projects.js';
import { PLATFORM } from './platform.js';

const ALL = [
  node, docker, homebrew, python, rust, go, java, ruby,
  xcode, editors, macos, browsers, projects,
];

export function allCleaners() {
  return ALL.filter((c) => !c.platforms || c.platforms.includes(PLATFORM));
}

export function getCleaner(id) {
  return ALL.find((c) => c.id === id) || null;
}
