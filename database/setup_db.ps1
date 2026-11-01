# database/setup_db.ps1 - PowerShell Database Setup
param (
    [string]$HostName = "localhost",
    [int]$Port = 5432,
    [string]$Database = "course_registration",
    [string]$User = "postgres",
    [string]$Password = "postgres"
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " University Course Registration & Academic System" -ForegroundColor White
Write-Host " Automated PostgreSQL Setup (PowerShell)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not $Password) {
    $Password = Read-Host "Enter PostgreSQL password for '$User' [default: postgres]"
    if (-not $Password) { $Password = "postgres" }
}
$env:PGPASSWORD = $Password

# Locate psql executable
$psqlPath = (Get-Command psql -ErrorAction SilentlyContinue)?.Source
if (-not $psqlPath) {
    $candidates = @(
        "C:\Program Files\PostgreSQL\18\bin\psql.exe",
        "C:\Program Files\PostgreSQL\17\bin\psql.exe",
        "C:\Program Files\PostgreSQL\16\bin\psql.exe",
        "C:\Program Files\PostgreSQL\15\bin\psql.exe"
    )
    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            $psqlPath = $cand
            break
        }
    }
}

if (-not $psqlPath) {
    Write-Error "psql executable not found in PATH or standard Program Files. Please ensure PostgreSQL is installed."
    exit 1
}

Write-Host "Using PSQL at: $psqlPath" -ForegroundColor Gray

# Step 1: Create Database if needed
Write-Host "`n[1/2] Checking if database '$Database' exists..." -ForegroundColor Yellow
$dbCheck = & $psqlPath -h $HostName -p $Port -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database'" 2>$null

if ($dbCheck -ne "1") {
    Write-Host "Creating database '$Database'..." -ForegroundColor Green
    & $psqlPath -h $HostName -p $Port -U $User -d postgres -c "CREATE DATABASE $Database;"
} else {
    Write-Host "Database '$Database' already exists." -ForegroundColor Gray
}

# Step 2: Run init_all.sql
Write-Host "`n[2/2] Executing init_all.sql (Schema, Functions, Procedures, Triggers, Views, Indexes, Seed)..." -ForegroundColor Yellow
Set-Location -Path $PSScriptRoot
& $psqlPath -h $HostName -p $Port -U $User -d $Database -f "init_all.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " Database successfully initialized and seeded!" -ForegroundColor Green
    Write-Host " Demo Accounts Created:" -ForegroundColor White
    Write-Host "   Student: s001@student.edu           (Pass: Demo@1234)" -ForegroundColor Cyan
    Write-Host "   Faculty: alice.morgan@university.edu (Pass: Demo@1234)" -ForegroundColor Cyan
    Write-Host "   Admin:   admin@university.edu        (Pass: Demo@1234)" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Setup encountered an issue. Please review the error messages above." -ForegroundColor Red
}

