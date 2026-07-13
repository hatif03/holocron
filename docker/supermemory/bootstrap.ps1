#Requires -Version 5.1
<#
.SYNOPSIS
  Start Supermemory Local via Docker and capture the API key into .env
#>
param(
    [string]$EnvFile = (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) ".env"),
    [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = "Stop"
$ComposeFile = Join-Path (Split-Path $PSScriptRoot -Parent) "docker-compose.yml"
$ComposeDir = Split-Path $ComposeFile -Parent

Write-Host "Starting Supermemory Local..."
Push-Location $ComposeDir
try {
    docker compose up supermemory -d --build
} finally {
    Pop-Location
}

$containerName = docker compose -f $ComposeFile ps --format json supermemory 2>$null |
    ConvertFrom-Json |
    Select-Object -First 1 -ExpandProperty Name

if (-not $containerName) {
    $containerName = (docker ps --filter "publish=6767" --format "{{.Names}}" | Select-Object -First 1)
}

if (-not $containerName) {
    throw "Supermemory container not found. Check: docker compose -f $ComposeFile ps"
}

Write-Host "Waiting for API key in logs ($containerName)..."
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$apiKey = $null

while ((Get-Date) -lt $deadline) {
    $logs = docker logs $containerName 2>&1 | Out-String
    if ($logs -match "(sm_[a-zA-Z0-9_]+)") {
        $apiKey = $Matches[1]
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $apiKey) {
    Write-Host "API key not found in logs yet. Run manually:"
    Write-Host "  docker logs $containerName"
    exit 1
}

Write-Host "Found API key: $apiKey"

$envDir = Split-Path $EnvFile -Parent
if (-not (Test-Path $envDir)) {
    New-Item -ItemType Directory -Path $envDir -Force | Out-Null
}

$lines = @()
if (Test-Path $EnvFile) {
    $lines = Get-Content $EnvFile
    $lines = $lines | Where-Object {
        $_ -notmatch '^\s*SUPERMEMORY_API_URL\s*=' -and
        $_ -notmatch '^\s*SUPERMEMORY_API_KEY\s*='
    }
}

$lines += "SUPERMEMORY_API_URL=http://localhost:6767"
$lines += "SUPERMEMORY_API_KEY=$apiKey"
Set-Content -Path $EnvFile -Value $lines -Encoding UTF8

Write-Host "Wrote SUPERMEMORY_API_URL and SUPERMEMORY_API_KEY to $EnvFile"
Write-Host ""
Write-Host "Smoke test:"
Write-Host @"
curl http://localhost:6767/v3/documents `
  -H "Authorization: Bearer $apiKey" `
  -H "Content-Type: application/json" `
  -d '{\"content\":\"Holocron hackathon test\",\"containerTag\":\"holocron_dev\"}'
"@
