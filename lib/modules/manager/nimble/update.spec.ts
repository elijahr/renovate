import { describe, expect, it } from 'vitest';
import type { Upgrade } from '../types.ts';
import { updateDependency } from './update.ts';

describe('modules/manager/nimble/update', () => {
  it('updates dependency in-place while preserving quotes and comments', () => {
    const fileContent = `
# Dependencies
requires "zippy >= 0.10.4" # fast compression
requires "checksums >= 0.1.0"
    `;

    const upgrade: Upgrade = {
      depName: 'zippy',
      currentValue: '>= 0.10.4',
      newValue: '0.11.0',
      replaceString: 'zippy >= 0.10.4',
    };

    const res = updateDependency({
      fileContent,
      packageFile: 'sample.nimble',
      upgrade,
    });

    expect(res).toContain('requires "zippy >= 0.11.0" # fast compression');
    expect(res).toContain('requires "checksums >= 0.1.0"');
  });

  it('updates multi-dependency lines without affecting siblings', () => {
    const fileContent = 'requires "zippy >= 0.10.4", "checksums >= 0.1.0"';

    const upgrade: Upgrade = {
      depName: 'zippy',
      currentValue: '>= 0.10.4',
      newValue: '0.11.0',
      replaceString: 'zippy >= 0.10.4',
    };

    const res = updateDependency({
      fileContent,
      packageFile: 'sample.nimble',
      upgrade,
    });

    expect(res).toBe('requires "zippy >= 0.11.0", "checksums >= 0.1.0"');
  });

  it('preserves single quotes when updating', () => {
    const fileContent = "requires 'yaml ^= 2.1.0'";

    const upgrade: Upgrade = {
      depName: 'yaml',
      currentValue: '^= 2.1.0',
      newValue: '^= 2.2.0',
      replaceString: 'yaml ^= 2.1.0',
    };

    const res = updateDependency({
      fileContent,
      packageFile: 'sample.nimble',
      upgrade,
    });

    expect(res).toBe("requires 'yaml ^= 2.2.0'");
  });

  it('does not mutate commented lines matching replaceString', () => {
    const fileContent = `# requires "zippy >= 0.10.4"\nrequires "zippy >= 0.10.4"`;

    const upgrade: Upgrade = {
      depName: 'zippy',
      currentValue: '>= 0.10.4',
      newValue: '0.11.0',
      replaceString: 'zippy >= 0.10.4',
    };

    const res = updateDependency({
      fileContent,
      packageFile: 'sample.nimble',
      upgrade,
    });

    expect(res).toBe(
      `# requires "zippy >= 0.10.4"\nrequires "zippy >= 0.11.0"`,
    );
  });
});
