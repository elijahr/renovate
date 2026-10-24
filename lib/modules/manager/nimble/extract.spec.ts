import { describe, expect, it } from 'vitest';
import {
  extractPackageFile,
  parseDependencyItem,
  parseRequiresItems,
} from './extract.ts';

describe('modules/manager/nimble/extract', () => {
  describe('parseRequiresItems', () => {
    it('extracts multiple comma-separated items', () => {
      const items = parseRequiresItems(
        'requires "zippy >= 0.10.4", "checksums >= 0.1.0"',
      );
      expect(items).toEqual(['zippy >= 0.10.4', 'checksums >= 0.1.0']);
    });

    it('extracts single quoted items', () => {
      const items = parseRequiresItems("requires 'nim >= 2.0.0'");
      expect(items).toEqual(['nim >= 2.0.0']);
    });
  });

  describe('parseDependencyItem', () => {
    it('handles standard constraint operators', () => {
      expect(parseDependencyItem('zippy >= 0.10.4')).toEqual({
        depName: 'zippy',
        currentValue: '>= 0.10.4',
      });
      expect(parseDependencyItem('yaml ^= 2.1.0')).toEqual({
        depName: 'yaml',
        currentValue: '^= 2.1.0',
      });
    });

    it('handles VCS ref pins', () => {
      expect(parseDependencyItem('ws#head')).toEqual({
        depName: 'ws',
        currentValue: '#head',
      });
      expect(parseDependencyItem('pkg#main')).toEqual({
        depName: 'pkg',
        currentValue: '#main',
      });
    });

    it('handles bare packages without version', () => {
      expect(parseDependencyItem('posix_utils')).toEqual({
        depName: 'posix_utils',
        currentValue: '',
      });
    });

    it('strips feature flags', () => {
      expect(parseDependencyItem('cligen [cli] >= 1.0.0')).toEqual({
        depName: 'cligen',
        currentValue: '>= 1.0.0',
      });
    });
  });

  describe('extractPackageFile', () => {
    it('returns null on empty content', () => {
      expect(extractPackageFile('')).toBeNull();
    });

    it('extracts dependencies from real-world nimble manifest', () => {
      const content = `
# Package
version       = "0.1.0"
author        = "Axiomantic"
description   = "Sample package"
license       = "MIT"

# Dependencies
requires "nim >= 2.0.0"
requires "zippy >= 0.10.4", "checksums >= 0.1.0"
requires "ws#head"

task test, "Run tests":
  exec "nim c -r tests/test_all.nim"
      `;

      const res = extractPackageFile(content);
      expect(res).not.toBeNull();
      expect(res?.deps).toHaveLength(4);

      expect(res?.deps[0]).toMatchObject({
        depName: 'nim',
        currentValue: '>= 2.0.0',
        depType: 'compiler',
      });

      expect(res?.deps[1]).toMatchObject({
        depName: 'zippy',
        currentValue: '>= 0.10.4',
        depType: 'dependencies',
      });

      expect(res?.deps[2]).toMatchObject({
        depName: 'checksums',
        currentValue: '>= 0.1.0',
        depType: 'dependencies',
      });

      expect(res?.deps[3]).toMatchObject({
        depName: 'ws',
        currentValue: '#head',
        depType: 'dependencies',
      });
    });

    it('ignores requires inside task blocks', () => {
      const content = `
version = "1.0.0"
requires "nim >= 2.0.0"

task test, "Run tests":
  echo "requires inside task block should be ignored"
  exec "echo requires not real"
      `;

      const res = extractPackageFile(content);
      expect(res).not.toBeNull();
      expect(res?.deps).toHaveLength(1);
      expect(res?.deps[0].depName).toBe('nim');
    });
  });
});
