Extracts dependencies from Nimble (`*.nimble`) package manifest files and updates lockfiles (`nimble.lock` and `atlas.lock`).

### File Matching

Renovate detects Nimble dependencies in:

- Files matching `(^|/)[^/]+\.nimble$` (e.g. `mypackage.nimble`)
- Lockfiles matching `(^|/)nimble\.lock$` (v1 and v2 formats)
- Atlas workspace lockfiles matching `(^|/)atlas\.lock$`

Renovate ignores vendor directories and local dependency caches matching:

- `(^|/)nimcache/`
- `(^|/)nimbledeps/`
- `(^|/)\.nimble/`
- `(^|/)deps/`

### Features and Capabilities

- **Manifest Parsing**: Extracts package requirements from `requires` statements in `*.nimble` files, including single-line, multi-line continuations, and comma-separated dependency lists.
- **Lockfile Maintenance**: Automatically updates corresponding entries in `nimble.lock` (updating `version`, `vcsRevision`, `url`, and checksums) and `atlas.lock`.
- **Registry & Git Support**: Resolves canonical package names via the official Nimble package directory (`nimble-packages`) and Git-hosted dependencies (`github`, `gitlab`, `sourcehut`).
- **Version Ranges & Revisions**: Supports semver and loose versions, version constraint operators (`==`, `>=`, `<=`, `~=`, `>`, `<`), Git commit SHA pins, and branch references (`#head`).
