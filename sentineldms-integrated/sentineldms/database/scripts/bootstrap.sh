#!/usr/bin/env bash
# ============================================================
# SentinelDMS — Database Bootstrap Script
# Usage:
#   ./scripts/bootstrap.sh          → apply schema + seed
#   ./scripts/bootstrap.sh schema   → schema only
#   ./scripts/bootstrap.sh seed     → seed only
#   ./scripts/bootstrap.sh es       → create Elasticsearch index
#   ./scripts/bootstrap.sh reset    → drop & recreate everything
# ============================================================
set -euo pipefail

PG_HOST="${PGHOST:-localhost}"
PG_PORT="${PGPORT:-5432}"
PG_USER="${PGUSER:-sentinel}"
PG_PASS="${PGPASSWORD:-sentinel_secret_change_in_prod}"
PG_DB="${PGDATABASE:-sentineldms}"

ES_HOST="${ES_HOST:-http://localhost:9200}"
ES_INDEX="sentineldms_documents"

PSQL="psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d $PG_DB"
export PGPASSWORD="$PG_PASS"

echo "=================================================="
echo "  SentinelDMS Database Bootstrap"
echo "=================================================="

run_schema() {
  echo "[1/2] Applying schema (migrations/001_initial_schema.sql)..."
  $PSQL -f "$(dirname "$0")/../migrations/001_initial_schema.sql"
  echo "      Schema applied."
}

run_seed() {
  echo "[2/2] Loading seed data (seeds/001_seed_data.sql)..."
  $PSQL -f "$(dirname "$0")/../seeds/001_seed_data.sql"
  echo "      Seed data loaded."
}

create_es_index() {
  echo "[ES]  Creating Elasticsearch index '$ES_INDEX'..."
  # Delete if exists (dev only)
  curl -s -o /dev/null -X DELETE "$ES_HOST/$ES_INDEX" || true

  MAPPING=$(cat "$(dirname "$0")/../config/elasticsearch_mapping.json" \
    | python3 -c "
import json, sys
data = json.load(sys.stdin)
out = {'settings': data['settings'], 'mappings': data['mappings']}
print(json.dumps(out))
")

  curl -s -X PUT "$ES_HOST/$ES_INDEX" \
    -H 'Content-Type: application/json' \
    -d "$MAPPING"
  echo ""
  echo "      Elasticsearch index created."
}

reset_db() {
  echo "[RESET] Dropping and recreating database '$PG_DB'..."
  PGPASSWORD="$PG_PASS" psql -h $PG_HOST -p $PG_PORT -U $PG_USER -d postgres \
    -c "DROP DATABASE IF EXISTS $PG_DB;" \
    -c "CREATE DATABASE $PG_DB OWNER $PG_USER;"
  echo "        Database recreated."
  run_schema
  run_seed
}

case "${1:-all}" in
  schema)  run_schema ;;
  seed)    run_seed ;;
  es)      create_es_index ;;
  reset)   reset_db && create_es_index ;;
  all|*)   run_schema && run_seed && create_es_index ;;
esac

echo "=================================================="
echo "  Done. SentinelDMS data layer is ready."
echo "=================================================="
