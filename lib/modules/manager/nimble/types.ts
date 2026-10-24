export interface NimbleManagerData {
  feature?: string;
  pinType?: 'head' | 'branch' | 'commit';
  rawConstraint?: string;
}

export interface NimbleLockPackage {
  version?: string;
  vcsRevision?: string;
  url?: string;
  downloadMethod?: string;
}

export interface NimbleLockFile {
  version?: number;
  packages?: Record<string, NimbleLockPackage>;
}
