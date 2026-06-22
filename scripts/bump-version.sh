#!/usr/bin/env bash
# Usage: ./scripts/bump-version.sh 0.10.6
# Updates package.json version, commits, creates and pushes the tag.
set -euo pipefail

VERSION="${1:?Usage: $0 <version>  (e.g. 0.10.6)}"
TAG="v${VERSION}"

# Guard: working tree must be clean
if ! git diff-index --quiet HEAD --; then
  echo "ERROR: working tree is dirty. Commit or stash changes first." >&2
  exit 1
fi

# Update package.json
node -e "
  const p = require('./package.json');
  p.version = '${VERSION}';
  require('fs').writeFileSync('./package.json', JSON.stringify(p, null, 2) + '\n');
"

git add package.json
git commit -m "release: bump to ${TAG}"
git tag "${TAG}"

echo "✅ package.json → ${VERSION}"
echo "✅ Tag ${TAG} created"
echo ""
echo "Next: git push origin main && git push origin ${TAG}"
