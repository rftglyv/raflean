import { join } from 'node:path';
import { HOME, macLibrary, IS_MAC } from '../platform.js';
import { dirSizeAsync, exists, has, sh } from '../shell.js';

export default {
  id: 'xcode',
  label: 'Xcode / iOS development',
  platforms: ['darwin'],
  risk: 'safe',

  async scan() {
    if (!IS_MAC) return [];
    const items = [];

    // DerivedData — always safe to nuke
    const derived = macLibrary('Developer', 'Xcode', 'DerivedData');
    if (exists(derived)) {
      items.push({
        id: 'xcode-deriveddata',
        label: 'Xcode DerivedData',
        path: derived,
        bytes: await dirSizeAsync(derived),
        description: 'build artifacts — rebuild on next compile',
      });
    }

    // Archives — CAREFUL: user may need these for App Store resubmission
    const archives = macLibrary('Developer', 'Xcode', 'Archives');
    if (exists(archives)) {
      items.push({
        id: 'xcode-archives',
        label: 'Xcode Archives',
        path: archives,
        bytes: await dirSizeAsync(archives),
        risk: 'careful',
        description: 'release archives for App Store — review before deleting',
      });
    }

    // iOS DeviceSupport — regenerated when device connects
    const iosDev = macLibrary('Developer', 'Xcode', 'iOS DeviceSupport');
    if (exists(iosDev)) {
      items.push({
        id: 'xcode-ios-devicesupport',
        label: 'iOS DeviceSupport (all versions)',
        path: iosDev,
        bytes: await dirSizeAsync(iosDev),
        risk: 'moderate',
        description: 'regenerates when iOS devices reconnect',
      });
    }
    const watchDev = macLibrary('Developer', 'Xcode', 'watchOS DeviceSupport');
    if (exists(watchDev)) {
      items.push({
        id: 'xcode-watchos-devicesupport',
        label: 'watchOS DeviceSupport',
        path: watchDev,
        bytes: await dirSizeAsync(watchDev),
        risk: 'moderate',
      });
    }
    const tvDev = macLibrary('Developer', 'Xcode', 'tvOS DeviceSupport');
    if (exists(tvDev)) {
      items.push({
        id: 'xcode-tvos-devicesupport',
        label: 'tvOS DeviceSupport',
        path: tvDev,
        bytes: await dirSizeAsync(tvDev),
        risk: 'moderate',
      });
    }

    // Unavailable / outdated simulators
    if (has('xcrun')) {
      const unavail = sh('xcrun simctl list devices unavailable 2>/dev/null');
      if (unavail && unavail.includes('(') ) {
        // estimate size via CoreSimulator/Devices bytes is too coarse, use 0 and rely on command
        items.push({
          id: 'xcode-unavailable-simulators',
          label: 'Unavailable iOS simulators',
          bytes: 0,
          command: 'xcrun simctl delete unavailable >/dev/null 2>&1 || true',
          risk: 'safe',
          description: 'removes simulators for uninstalled runtimes',
        });
      }
    }

    // Xcode app cache
    const xcodeCache = macLibrary('Caches', 'com.apple.dt.Xcode');
    if (exists(xcodeCache)) {
      items.push({
        id: 'xcode-app-cache',
        label: 'Xcode app cache',
        path: xcodeCache,
        bytes: await dirSizeAsync(xcodeCache),
      });
    }

    // Swift Package Manager cache
    const swiftpm = macLibrary('Caches', 'org.swift.swiftpm');
    if (exists(swiftpm)) {
      items.push({
        id: 'swiftpm-cache',
        label: 'Swift Package Manager cache',
        path: swiftpm,
        bytes: await dirSizeAsync(swiftpm),
      });
    }

    // Old iOS simulator runtimes (may exist beyond current Xcode)
    const coreSim = macLibrary('Developer', 'CoreSimulator', 'Caches');
    if (exists(coreSim)) {
      items.push({
        id: 'coresim-caches',
        label: 'CoreSimulator caches',
        path: coreSim,
        bytes: await dirSizeAsync(coreSim),
      });
    }

    return items;
  },
};
