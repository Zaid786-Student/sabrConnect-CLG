#!/usr/bin/env bash
# Pre-deployment sanity check. Run this before pushing:
#   bash scripts/predeploy-check.sh
#
# This validates everything that doesn't require your live Supabase
# credentials. It does NOT create your Supabase project, run the schema, or
# deploy anywhere — those steps need your own account/credentials, see
# README.md.
set -euo pipefail

echo "==> Installing dependencies"
npm install

echo "==> Building production bundle"
npm run build

echo "==> Checking .env"
if [ -f .env ]; then
  if grep -q "^VITE_SUPABASE_URL=.\+" .env && grep -q "^VITE_SUPABASE_ANON_KEY=.\+" .env; then
    echo "    .env has Supabase credentials set — app will run in Supabase mode."
  else
    echo "    .env exists but is missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — app will run in local mock mode."
  fi
else
  echo "    No .env found — app will run in local mock mode (copy .env.example to .env to connect Supabase)."
fi

echo
echo "Build OK. Remaining steps that need your own Supabase/hosting account:"
echo "  1. Create a project at supabase.com and run supabase/schema.sql in its SQL editor."
echo "  2. node supabase/seed.mjs   (with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set) to add demo data."
echo "  3. Push this repo and connect it on vercel.com or netlify.com, setting"
echo "     VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY as environment variables there."
