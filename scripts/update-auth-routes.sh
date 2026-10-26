#!/bin/bash
# Bulk-update all API route handlers to pass `req` to getSession() so the
# Authorization: Bearer header fallback works on every endpoint (not just
# /api/auth). For routes whose handler signature doesn't already accept
# `req: NextRequest`, add it.

set -e

# Files that need updating
FILES=(
  "/home/z/my-project/src/app/api/audit-ogs/route.ts"
  "/home/z/my-project/src/app/api/audit-logs/route.ts"
  "/home/z/my-project/src/app/api/clients/route.ts"
  "/home/z/my-project/src/app/api/clients/[id]/route.ts"
  "/home/z/my-project/src/app/api/component-types/route.ts"
  "/home/z/my-project/src/app/api/component-types/[id]/route.ts"
  "/home/z/my-project/src/app/api/dashboard/route.ts"
  "/home/z/my-project/src/app/api/equipment/route.ts"
  "/home/z/my-project/src/app/api/equipment/[id]/route.ts"
  "/home/z/my-project/src/app/api/equipment/[id]/inspections/route.ts"
  "/home/z/my-project/src/app/api/import-export/commit/route.ts"
  "/home/z/my-project/src/app/api/import-export/export/route.ts"
  "/home/z/my-project/src/app/api/import-export/preview/route.ts"
  "/home/z/my-project/src/app/api/inspections/route.ts"
  "/home/z/my-project/src/app/api/pipe-standards/route.ts"
  "/home/z/my-project/src/app/api/pipe-standards/[id]/route.ts"
  "/home/z/my-project/src/app/api/pipeline-inspections/route.ts"
  "/home/z/my-project/src/app/api/pipeline-inspections/[id]/route.ts"
  "/home/z/my-project/src/app/api/pipeline-inspections/[id]/measurements/route.ts"
  "/home/z/my-project/src/app/api/pipeline-inspections/[id]/measurements/[mid]/route.ts"
  "/home/z/my-project/src/app/api/pipeline-inspections/[id]/pdf/route.ts"
  "/home/z/my-project/src/app/api/pipeline-inspections/[id]/approve/route.ts"
  "/home/z/my-project/src/app/api/pipeline-inspections/[id]/override/route.ts"
  "/home/z/my-project/src/app/api/plants/route.ts"
  "/home/z/my-project/src/app/api/plants/[id]/route.ts"
)

for f in "${FILES[@]}"; do
  [ -f "$f" ] || continue
  echo "Updating $f"
  # 1. Replace `await getSession()` with `await getSession(req)`
  perl -i -pe 's/await getSession\(\)/await getSession(req)/g' "$f"
  # 2. For handlers that don't take req yet, add it. Match:
  #    `export async function GET() {`  →  `export async function GET(req: NextRequest) {`
  #    Same for POST, PUT, DELETE, PATCH.
  #    But skip handlers that already take a parameter (they have `(` followed by something other than `)`).
  perl -i -pe 's/export async function (GET|POST|PUT|DELETE|PATCH)\(\)\s*\{/export async function $1(req: NextRequest) {/g' "$f"
  # 3. Some handlers take a context param like (req, ctx) but for the GET-with-no-args case we just added req.
  #    Make sure NextRequest is imported.
  if ! grep -q "import.*NextRequest" "$f"; then
    perl -i -pe 's/^import \{ NextResponse \} from "next\/server";/import { NextRequest, NextResponse } from "next\/server";/' "$f"
  fi
done

echo "Done."
