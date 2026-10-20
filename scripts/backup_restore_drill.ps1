<#
.SYNOPSIS
    MessSaver Database Backup & Restoration Verification Drill (PowerShell)
.DESCRIPTION
    Creates a PostgreSQL database dump and verifies restoration against a temporary verification database.
#>

param(
    [string]$DbHost = "localhost",
    [int]$DbPort = 5432,
    [string]$DbUser = "postgres",
    [string]$DbName = "messaver_db",
    [string]$BackupDir = "./backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "messaver_backup_$Timestamp.dump"
$VerifyDbName = "messaver_restore_drill_$Timestamp"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " MessSaver Database Backup & Restoration Drill (PowerShell)" -ForegroundColor Cyan
Write-Host " Timestamp: $Timestamp"
Write-Host " Source DB: ${DbName}@${DbHost}:${DbPort}"
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "[1/4] Generating PostgreSQL custom-format backup..." -ForegroundColor Yellow
& pg_dump -h $DbHost -p $DbPort -U $DbUser -F c -b -f $BackupFile $DbName
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backup creation failed with exit code $LASTEXITCODE"
}
$BackupItem = Get-Item $BackupFile
Write-Host " Backup created successfully: $BackupFile ($([math]::Round($BackupItem.Length / 1KB, 2)) KB)" -ForegroundColor Green

Write-Host "[2/4] Creating temporary verification database: $VerifyDbName..." -ForegroundColor Yellow
& createdb -h $DbHost -p $DbPort -U $DbUser $VerifyDbName
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create verification database"
}

try {
    Write-Host "[3/4] Restoring backup archive into verification database..." -ForegroundColor Yellow
    & pg_restore -h $DbHost -p $DbPort -U $DbUser -d $VerifyDbName --clean --if-exists --exit-on-error $BackupFile
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore failed with exit code $LASTEXITCODE"
    }

    Write-Host "[4/4] Verifying table counts in restored schema..." -ForegroundColor Yellow
    $TableCount = & psql -h $DbHost -p $DbPort -U $DbUser -d $VerifyDbName -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
    Write-Host " Restored public table count: $($TableCount.Trim())" -ForegroundColor Green

    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " SUCCESS: Backup and Restoration Drill Completed Safely!" -ForegroundColor Green
    Write-Host " Backup File: $BackupFile"
    Write-Host "==========================================================" -ForegroundColor Cyan
}
finally {
    Write-Host "Cleaning up temporary verification database..." -ForegroundColor Yellow
    & dropdb -h $DbHost -p $DbPort -U $DbUser $VerifyDbName
}
