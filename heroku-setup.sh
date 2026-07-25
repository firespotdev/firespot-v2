#!/usr/bin/env bash
#
# One-time Heroku config to deploy the API (api/) from this monorepo.
#
# Strategy: a "subdir" buildpack flattens api/ to the build root, then the
# standard Node buildpack builds it. Because the flattened build has no
# workspace pnpm-workspace.yaml, native build-approvals are carried inside
# api/package.json ("pnpm.onlyBuiltDependencies") so bcrypt/sharp compile.
#
# Requires: heroku CLI logged in (`heroku login`) with access to the app.
# Run from anywhere. Review before running.

set -euo pipefail

APP="firespotlite"          # existing Heroku app (keep it — preserves config vars & add-ons)
SUBDIR="api"                # monorepo folder to deploy

echo "==> Setting buildpacks on $APP"
heroku buildpacks:clear -a "$APP"
# 1) flatten $SUBDIR to the build root
heroku buildpacks:add --index 1 https://github.com/timanovsky/subdir-heroku-buildpack -a "$APP"
# 2) build the (now root) Node app
heroku buildpacks:add --index 2 heroku/nodejs -a "$APP"

echo "==> Telling the subdir buildpack which folder to use"
heroku config:set PROJECT_PATH="$SUBDIR" -a "$APP"

echo "==> Current buildpacks:"
heroku buildpacks -a "$APP"

echo
echo "Done. Deploy with EITHER:"
echo "  A) GitHub integration: Heroku Dashboard > Deploy > connect firespotdev/firespot-v2,"
echo "     set deploy branch to 'master', then Deploy Branch (or enable automatic deploys)."
echo "  B) Manual git push:    git push https://git.heroku.com/$APP.git master:main"
echo
echo "After first deploy, verify: heroku logs --tail -a $APP  (watch for bcrypt/sharp load + boot)"
