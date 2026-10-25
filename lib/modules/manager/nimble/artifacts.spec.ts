import { fs, partial } from '~test/util.ts';
import type { FileAddition } from '../../../util/git/types.ts';
import type { UpdateArtifactsConfig } from '../types.ts';
import { updateArtifacts } from './artifacts.ts';

vi.mock('../../../util/fs/index.ts');

describe('modules/manager/nimble/artifacts', () => {
  beforeEach(() => {
    fs.getSiblingFileName.mockImplementation(
      (_file: string, sibling: string) => sibling,
    );
  });

  it('returns null if no updatedDeps', async () => {
    const res = await updateArtifacts({
      packageFileName: 'project.nimble',
      updatedDeps: [],
      newPackageFileContent: '',
      config: partial<UpdateArtifactsConfig>({}),
    });
    expect(res).toBeNull();
  });

  it('updates nimble.lock when dependency changes', async () => {
    const mockLock = JSON.stringify({
      version: 1,
      packages: {
        chronos: {
          version: '3.0.0',
          vcsRevision: 'abc1234',
        },
      },
    });

    fs.readLocalFile.mockImplementation((file: string) => {
      if (file === 'nimble.lock') {
        return Promise.resolve(mockLock);
      }
      return Promise.resolve(null);
    });

    const res = await updateArtifacts({
      packageFileName: 'project.nimble',
      updatedDeps: [
        {
          depName: 'chronos',
          newValue: '>= 4.0.0',
        },
      ],
      newPackageFileContent: '',
      config: partial<UpdateArtifactsConfig>({}),
    });

    expect(res).toHaveLength(1);
    expect(res![0].file?.path).toBe('nimble.lock');
    const file = res![0].file as FileAddition;
    const updated = JSON.parse(file.contents as string);
    expect(updated.packages.chronos.version).toBe('4.0.0');
  });

  it('updates nimble.lock and atlas.lock with newDigest', async () => {
    const mockNimbleLock = JSON.stringify({
      version: 1,
      packages: {
        chronos: {
          version: '3.0.0',
          vcsRevision: 'oldsha',
        },
      },
    });
    const mockAtlasLock = JSON.stringify({
      packages: {
        chronos: {
          version: '3.0.0',
          commit: 'oldsha',
        },
      },
    });

    fs.readLocalFile.mockImplementation((file: string) => {
      if (file === 'nimble.lock') {
        return Promise.resolve(mockNimbleLock);
      }
      if (file === 'atlas.lock') {
        return Promise.resolve(mockAtlasLock);
      }
      return Promise.resolve(null);
    });

    const res = await updateArtifacts({
      packageFileName: 'project.nimble',
      updatedDeps: [
        {
          depName: 'chronos',
          newValue: '>= 4.0.0',
          newDigest: 'newsha123',
        },
      ],
      newPackageFileContent: '',
      config: partial<UpdateArtifactsConfig>({}),
    });

    expect(res).toHaveLength(2);
    const nimbleFile = res![0].file as FileAddition;
    const nimbleUpdated = JSON.parse(nimbleFile.contents as string);
    expect(nimbleUpdated.packages.chronos.version).toBe('4.0.0');
    expect(nimbleUpdated.packages.chronos.vcsRevision).toBe('newsha123');

    const atlasFile = res![1].file as FileAddition;
    const atlasUpdated = JSON.parse(atlasFile.contents as string);
    expect(atlasUpdated.packages.chronos.version).toBe('4.0.0');
    expect(atlasUpdated.packages.chronos.commit).toBe('newsha123');
  });

  it('handles invalid json gracefully in nimble.lock', async () => {
    fs.readLocalFile.mockImplementation((file: string) => {
      if (file === 'nimble.lock') {
        return Promise.resolve('invalid json');
      }
      return Promise.resolve(null);
    });

    const res = await updateArtifacts({
      packageFileName: 'project.nimble',
      updatedDeps: [
        {
          depName: 'chronos',
          newValue: '4.0.0',
        },
      ],
      newPackageFileContent: '',
      config: partial<UpdateArtifactsConfig>({}),
    });

    expect(res).toBeNull();
  });
});
