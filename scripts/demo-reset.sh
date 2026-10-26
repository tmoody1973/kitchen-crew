#!/usr/bin/env bash
# Puts the demo account ("Demo Week") back to its saved sample week, so every judge sees the same thing.
# Needs Convex admin access (run from this repo after `npx convex dev` has been set up) and the local
# snapshot at scripts/demo/snapshot.json (git-ignored: it holds recipe text from creators' sites).
set -euo pipefail
cd "$(dirname "$0")/.."
DEMO_USER_ID="user_3LCzgW9Ix3oUqX4GnOPQZ0liegw"
SNAPSHOT="scripts/demo/snapshot.json"
[ -f "$SNAPSHOT" ] || { echo "Missing $SNAPSHOT (take one with: npx convex run demo:snapshot '{\"userId\":\"$DEMO_USER_ID\"}' > $SNAPSHOT)"; exit 1; }
npx convex run demo:restore "{\"userId\":\"$DEMO_USER_ID\",\"snapshot\":$(cat "$SNAPSHOT")}"
