@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   University Course Registration & Management System
echo   PostgreSQL Database Auto-Setup Script
echo ========================================================

REM Set default credentials if not passed
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=course_registration
set DB_USER=postgres

echo Target Database: %DB_NAME% on %DB_HOST%:%DB_PORT%
echo Connecting as: %DB_USER%
echo.

REM Prompt for password if not set
if "%PGPASSWORD%"=="" (
    set /p PGPASSWORD="Enter PostgreSQL password for user '%DB_USER%' [default: postgres]: "
    if "!PGPASSWORD!"=="" set PGPASSWORD=postgres
)

REM Find psql executable
set PSQL="psql"
where psql >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" (
        set PSQL="C:\Program Files\PostgreSQL\18\bin\psql.exe"
    ) else if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" (
        set PSQL="C:\Program Files\PostgreSQL\17\bin\psql.exe"
    ) else if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
        set PSQL="C:\Program Files\PostgreSQL\16\bin\psql.exe"
    ) else if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" (
        set PSQL="C:\Program Files\PostgreSQL\15\bin\psql.exe"
    ) else (
        echo [ERROR] psql executable not found in PATH or standard Program Files locations.
        echo Please ensure PostgreSQL is installed and psql is in your PATH.
        pause
        exit /b 1
    )
)

echo [1/2] Creating database '%DB_NAME%' if it does not exist...
%PSQL% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '%DB_NAME%'" | findstr 1 >nul
if %errorlevel% neq 0 (
    %PSQL% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE %DB_NAME%;"
    echo Created database '%DB_NAME%'.
) else (
    echo Database '%DB_NAME%' already exists.
)

echo.
echo [2/2] Running init_all.sql to build schema, functions, triggers, and seed data...
cd /d "%~dp0"
%PSQL% -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f init_all.sql

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   Database successfully initialized!
    echo   Demo accounts created:
    echo     Student: s001@student.edu           (Pass: Demo@1234)
    echo     Faculty: alice.morgan@university.edu (Pass: Demo@1234)
    echo     Admin:   admin@university.edu        (Pass: Demo@1234)
    echo ========================================================
) else (
    echo.
    echo [ERROR] Database initialization encountered errors. Review output above.
)

pause

