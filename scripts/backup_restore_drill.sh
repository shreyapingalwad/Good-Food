#!/usr/bin/env bash
# ==============================================================================
# MessSaver Database Backup & Restoration Verification Drill
# ==============================================================================
# Tests full database backup and automated restoration verification.
# Safe execution: Restores into a dedicated verification database, never production.
# ==============================================================================

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-messaver_db}"
VERIFY_DB_NAME="messaver_restore_drill_$(date +%s)"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/messaver_backup_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "=========================================================="
echo " MessSaver Database Backup & Restoration Drill"
echo " Timestamp: ${TIMESTAMP}"
echo " Source DB: ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "=========================================================="

echo "[1/4] Generating PostgreSQL custom-format backup..."
PGPASSWORD="${PGPASSWORD:-}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -F c \
    -b \
    -v \
    -f "${BACKUP_FILE}" \
    "${DB_NAME}"

BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo " Backup created successfully: ${BACKUP_FILE} (Size: ${BACKUP_SIZE})"

echo "[2/4] Creating temporary verification database: ${VERIFY_DB_NAME}..."
PGPASSWORD="${PGPASSWORD:-}" createdb \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    "${VERIFY_DB_NAME}"

echo "[3/4] Restoring backup archive into verification database..."
PGPASSWORD="${PGPASSWORD:-}" pg_restore \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${VERIFY_DB_NAME}" \
    --clean \
    --if-exists \
    --exit-on-error \
    "${BACKUP_FILE}" || {
        echo " Restore failed! Cleaning up verification database..."
        dropdb -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" "${VERIFY_DB_NAME}" || true
        exit 1
    }

echo "[4/4] Verifying table counts in restored schema..."
TABLE_COUNT=$(PGPASSWORD="${PGPASSWORD:-}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${VERIFY_DB_NAME}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo " Restored public table count: $(echo ${TABLE_COUNT} | tr -d ' ')"

echo "Cleaning up temporary verification database..."
PGPASSWORD="${PGPASSWORD:-}" dropdb \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    "${VERIFY_DB_NAME}"

echo "=========================================================="
echo " SUCCESS: Backup and Restoration Drill Completed Safely!"
echo " Backup File: ${BACKUP_FILE}"
echo "=========================================================="
