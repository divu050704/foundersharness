# foundersharness Auto-Installer & Setup Script
# Run this script to build, install dependencies, register to Windows startup, and launch the tray app.

$ErrorActionPreference = "Stop"
Clear-Host

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     FOUNDERSHARNESS DEV TRAY HELPER INSTALLER" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verify environment
Write-Host "[1/5] Checking .NET environment..." -ForegroundColor Yellow
$dotnetPath = "$env:USERPROFILE\.dotnet\dotnet.exe"
if (-not (Test-Path $dotnetPath)) {
    # Try global dotnet
    if (Get-Command "dotnet" -ErrorAction SilentlyContinue) {
        $dotnetPath = "dotnet"
    } else {
        Write-Error "Could not locate .NET SDK. Please install .NET SDK 8.0 first."
    }
}
Write-Host "Using .NET tool: $dotnetPath" -ForegroundColor Green

# 2. Build project
Write-Host ""
Write-Host "[2/5] Building project in Release mode..." -ForegroundColor Yellow
$projectDir = Join-Path $PSScriptRoot "device-hook"
& $dotnetPath build $projectDir -c Release

# Locate the output path
$outputDir = Join-Path $projectDir "bin\Release\net8.0-windows"
$exePath = Join-Path $outputDir "foundersharness.exe"
$playwrightScript = Join-Path $outputDir "playwright.ps1"

if (-not (Test-Path $exePath)) {
    Write-Error "Build failed or executable not found at $exePath"
}
Write-Host "Build succeeded! Executable located at: $exePath" -ForegroundColor Green

# 3. Install Playwright browser dependencies
Write-Host ""
Write-Host "[3/5] Installing Playwright browsers (Chromium, Firefox, Webkit)..." -ForegroundColor Yellow
Write-Host "This might take a minute or two. Downloading binaries..." -ForegroundColor Gray

if (-not (Test-Path $playwrightScript)) {
    Write-Error "Playwright setup script not found at $playwrightScript. Make sure Microsoft.Playwright package is restored."
}

# Run playwright script to install browsers
& powershell.exe -ExecutionPolicy Bypass -File $playwrightScript install

Write-Host "Playwright browsers downloaded and ready!" -ForegroundColor Green

# 4. Register to Windows Startup (CurrentUser Run registry)
Write-Host ""
Write-Host "[4/5] Configuring app to run on Windows startup..." -ForegroundColor Yellow
try {
    $registryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    Set-ItemProperty -Path $registryPath -Name "foundersharness" -Value "`"$exePath`"" -Force
    Write-Host "Startup registry entry added successfully!" -ForegroundColor Green
} catch {
    Write-Host "Warning: Could not add startup registry key. Running as normal user should suffice." -ForegroundColor Red
}

# 5. Start the tray helper
Write-Host ""
Write-Host "[5/5] Launching foundersharness Tray Helper..." -ForegroundColor Yellow

# Start the executable immediately
Start-Process -FilePath $exePath -WorkingDirectory $outputDir

Write-Host "Successfully launched! Look for the Indigo 'H' icon in your Windows system tray." -ForegroundColor Green
Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "                  INSTALLATION COMPLETE!" -ForegroundColor Cyan
Write-Host "   WebSocket Server is now running on: ws://localhost:9000" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
