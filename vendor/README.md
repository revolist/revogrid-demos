# Shared UI package

`revolist-ui-3.0.14.tgz` is the public, compiled @revolist/ui 3.0.14 artifact built from the shared UI package. Consumer manifests and locks use this repository-local archive so fresh standalone installs work before registry publication. It contains the actual shared implementation and framework adapters, without a dependency on the parent monorepo.

After this exact artifact is published, replace the file dependency with `@revolist/ui: "3.0.14"` and regenerate the lockfile with pnpm. Keep preact pinned to 10.29.1. Do not change the version or archive bytes independently of the shared package release.
