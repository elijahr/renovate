import { isObject } from '@sindresorhus/is';
import { logger } from '../../../logger/index.ts';
import { getSiblingFileName, readLocalFile } from '../../../util/fs/index.ts';
import { regEx } from '../../../util/regex.ts';
import type { UpdateArtifact, UpdateArtifactsResult } from '../types.ts';

interface LockfileFormat {
  packages?: Record<string, { version?: string }>;
}

export async function updateArtifacts({
  packageFileName,
  updatedDeps,
}: UpdateArtifact): Promise<UpdateArtifactsResult[] | null> {
  logger.debug(`nimble.updateArtifacts(${packageFileName})`);

  if (!updatedDeps || updatedDeps.length === 0) {
    return null;
  }

  const results: UpdateArtifactsResult[] = [];
  const versionPrefixRegex = regEx('^[><=!~^&]+\\s*');

  // 1. Check for nimble.lock
  const nimbleLockPath = getSiblingFileName(packageFileName, 'nimble.lock');
  const nimbleLockContent = await readLocalFile(nimbleLockPath, 'utf8');

  if (nimbleLockContent) {
    try {
      const parsed = JSON.parse(nimbleLockContent) as unknown;
      if (isObject(parsed) && isObject((parsed as LockfileFormat).packages)) {
        const lock = parsed as LockfileFormat;
        let changed = false;
        for (const dep of updatedDeps) {
          const depName = dep.depName;
          const newVersion = dep.newValue ?? dep.newVersion;
          if (depName && newVersion && lock.packages?.[depName]) {
            lock.packages[depName].version = newVersion.replace(
              versionPrefixRegex,
              '',
            );
            changed = true;
          }
        }
        if (changed) {
          results.push({
            file: {
              type: 'addition',
              path: nimbleLockPath,
              contents: `${JSON.stringify(lock, null, 2)}\n`,
            },
          });
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to parse or update nimble.lock');
    }
  }

  // 2. Check for atlas.lock
  const atlasLockPath = getSiblingFileName(packageFileName, 'atlas.lock');
  const atlasLockContent = await readLocalFile(atlasLockPath, 'utf8');

  if (atlasLockContent) {
    try {
      const parsed = JSON.parse(atlasLockContent) as unknown;
      if (isObject(parsed) && isObject((parsed as LockfileFormat).packages)) {
        const lock = parsed as LockfileFormat;
        let changed = false;
        for (const dep of updatedDeps) {
          const depName = dep.depName;
          const newVersion = dep.newValue ?? dep.newVersion;
          if (depName && newVersion && lock.packages?.[depName]) {
            lock.packages[depName].version = newVersion.replace(
              versionPrefixRegex,
              '',
            );
            changed = true;
          }
        }
        if (changed) {
          results.push({
            file: {
              type: 'addition',
              path: atlasLockPath,
              contents: `${JSON.stringify(lock, null, 2)}\n`,
            },
          });
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to parse or update atlas.lock');
    }
  }

  return results.length > 0 ? results : null;
}
