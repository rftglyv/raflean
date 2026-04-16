import { join } from 'node:path';
import { HOME } from '../platform.js';
import { dirSizeAsync, exists } from '../shell.js';

export default {
  id: 'java',
  label: 'Java / JVM',
  platforms: ['darwin', 'linux'],
  risk: 'safe',

  async scan() {
    const items = [];

    // Gradle caches
    const gradleCaches = join(HOME, '.gradle', 'caches');
    if (exists(gradleCaches)) {
      items.push({
        id: 'gradle-caches',
        label: 'Gradle caches',
        path: gradleCaches,
        bytes: await dirSizeAsync(gradleCaches),
      });
    }

    // Gradle daemon logs
    const gradleDaemon = join(HOME, '.gradle', 'daemon');
    if (exists(gradleDaemon)) {
      items.push({
        id: 'gradle-daemon',
        label: 'Gradle daemon logs',
        path: gradleDaemon,
        bytes: await dirSizeAsync(gradleDaemon),
      });
    }

    // Maven local repository — CAREFUL: this is essentially like node_modules, but user-wide
    const m2 = join(HOME, '.m2', 'repository');
    if (exists(m2)) {
      items.push({
        id: 'maven-local-repo',
        label: 'Maven local repository (~/.m2/repository)',
        path: m2,
        bytes: await dirSizeAsync(m2),
        risk: 'moderate',
        description: 'will re-download on next build',
      });
    }

    // sbt (Scala)
    const sbt = join(HOME, '.sbt');
    if (exists(sbt)) {
      const boot = join(sbt, 'boot');
      if (exists(boot)) {
        items.push({
          id: 'sbt-boot',
          label: 'sbt boot cache',
          path: boot,
          bytes: await dirSizeAsync(boot),
        });
      }
    }

    // Coursier (Scala/JVM deps)
    const coursier = join(HOME, '.cache', 'coursier');
    if (exists(coursier)) {
      items.push({
        id: 'coursier-cache',
        label: 'Coursier cache',
        path: coursier,
        bytes: await dirSizeAsync(coursier),
      });
    }

    // Ivy cache
    const ivy = join(HOME, '.ivy2', 'cache');
    if (exists(ivy)) {
      items.push({
        id: 'ivy-cache',
        label: 'Ivy cache',
        path: ivy,
        bytes: await dirSizeAsync(ivy),
      });
    }

    return items;
  },
};
