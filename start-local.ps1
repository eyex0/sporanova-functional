$ErrorActionPreference = "SilentlyContinue"
Get-Content .env | ForEach-Object {
  if ($_ -match '^([^#][^=]+)=(.+)') {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
  }
}
$env:DISABLE_SECURE_COOKIE = "1"
$env:PORT = "3000"
$env:NODE_ENV = "development"
Write-Host "Starting SOPRANOVA on http://localhost:3000 ..."
node dist/index.js
