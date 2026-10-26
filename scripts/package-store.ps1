$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$manifestFile = Join-Path $projectRoot 'manifest.json'
$releaseVersion = (Get-Content -LiteralPath $manifestFile -Raw -Encoding UTF8 | ConvertFrom-Json).version
& node (Join-Path $PSScriptRoot 'package.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Extension packaging failed.' }
$extensionZip = Join-Path $projectRoot "dist/color-picker-$releaseVersion.zip"
$storeKit = Join-Path $projectRoot "dist/color-picker-store-kit-$releaseVersion.zip"
$kitSources = @(
  $extensionZip,
  (Join-Path $projectRoot 'store-assets'),
  (Join-Path $projectRoot 'privacy.html'),
  (Join-Path $projectRoot 'privacy.css'),
  (Join-Path $projectRoot 'icons')
)
Compress-Archive -LiteralPath $kitSources -DestinationPath $storeKit -Force
Write-Output "Store upload kit: $storeKit"
