import { regEx } from '../../../util/regex.ts';
import { GitTagsDatasource } from '../../datasource/git-tags/index.ts';
import type { PackageDependency, PackageFileContent } from '../types.ts';

export function parseRequiresItems(rawLine: string): string[] {
  const items: string[] = [];
  const regex = regEx('["\']([^"\']*)["\']', 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(rawLine)) !== null) {
    const rawItem = match[1].trim();
    if (!rawItem) {
      continue;
    }
    for (const subItem of rawItem.split(',')) {
      const trimmed = subItem.trim();
      if (trimmed) {
        items.push(trimmed);
      }
    }
  }
  return items;
}

export function parseDependencyItem(item: string): {
  depName: string;
  currentValue: string;
} {
  const trimmed = item.trim();
  // Strip feature flags like [gui]
  const noFlags = trimmed.replace(regEx('\\[[^\\]]*\\]'), '').trim();

  // Check for VCS ref: e.g. pkg#head, pkg#branch, pkg#commit
  const hashIdx = noFlags.indexOf('#');
  if (hashIdx !== -1) {
    const depName = noFlags.slice(0, hashIdx).trim();
    const vcsRef = noFlags.slice(hashIdx).trim();
    return { depName, currentValue: vcsRef };
  }

  // Check for operator constraints: >=, <=, ==, !=, ^=, ~=, >, <, &
  const opMatch = regEx('(?<op>[><=!~^&]+.*)$').exec(noFlags);
  if (opMatch?.index && opMatch.index > 0) {
    const depName = noFlags.slice(0, opMatch.index).trim();
    const currentValue = opMatch[0].trim();
    return { depName, currentValue };
  }

  // Bare package name with no version
  return { depName: noFlags, currentValue: '' };
}

const IGNORED_PATH_SEGMENTS = [
  '/nimbledeps/',
  '/deps/',
  '/nimcache/',
  '/.nimcache/',
];

export function isIgnoredPath(packageFile?: string): boolean {
  if (!packageFile) {
    return false;
  }
  const normalized = packageFile.replace(regEx('\\\\', 'g'), '/');
  return (
    IGNORED_PATH_SEGMENTS.some((seg) => normalized.includes(seg)) ||
    normalized.startsWith('nimbledeps/') ||
    normalized.startsWith('deps/') ||
    normalized.startsWith('nimcache/') ||
    normalized.startsWith('.nimcache/')
  );
}

export function extractPackageFile(
  content: string,
  packageFile?: string,
): PackageFileContent | null {
  if (!content || isIgnoredPath(packageFile)) {
    return null;
  }

  const deps: PackageDependency[] = [];
  const lines = content.split(regEx('\\r?\\n'));
  let inTaskBlock = false;
  let inRequiresContinuation = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if line begins or exits a task block
    if (regEx('^task\\s+[a-zA-Z0-9_]+').test(trimmed)) {
      inTaskBlock = true;
      inRequiresContinuation = false;
      continue;
    }

    // Unindented non-empty line exits task block
    if (inTaskBlock && line.length > 0 && !regEx('^\\s').test(line)) {
      inTaskBlock = false;
    }

    if (inTaskBlock) {
      continue;
    }

    // Ignore commented lines
    if (trimmed.startsWith('#')) {
      continue;
    }

    const isRequires = regEx('^requires\\s+').test(trimmed);
    if (isRequires || inRequiresContinuation) {
      const items = parseRequiresItems(line);
      for (const item of items) {
        const { depName, currentValue } = parseDependencyItem(item);
        if (!depName) {
          continue;
        }

        const isCompiler = depName.toLowerCase() === 'nim';
        let packageName: string | undefined;
        let cleanName = depName;

        if (isCompiler) {
          packageName = 'https://github.com/nim-lang/Nim';
        } else if (
          depName.startsWith('https://') ||
          depName.startsWith('http://') ||
          depName.startsWith('git@')
        ) {
          packageName = depName;
          const urlParts = depName.split('/');
          const lastPart = urlParts.at(-1)?.replace(regEx('\\.git$'), '');
          if (lastPart) {
            cleanName = lastPart;
          }
        }

        const dep: PackageDependency = {
          depName: cleanName,
          packageName,
          currentValue: currentValue || undefined,
          datasource: GitTagsDatasource.id,
          depType: isCompiler ? 'compiler' : 'dependencies',
          replaceString: item,
        };

        deps.push(dep);
      }
      inRequiresContinuation = trimmed.endsWith(',');
    }
  }

  if (deps.length === 0) {
    return null;
  }

  return {
    deps,
    lockFiles: ['nimble.lock', 'atlas.lock'],
  };
}
