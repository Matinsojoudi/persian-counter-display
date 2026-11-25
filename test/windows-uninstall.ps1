$ErrorActionPreference = 'Stop'

# Runs only on disposable Windows CI runners. NSIS /S uses per-user installation.
$installer = @(Get-ChildItem -Path 'dist' -Filter '*.exe' -File)
if ($installer.Count -ne 1) { throw "Expected exactly one installer; found $($installer.Count)." }
$process = Start-Process -FilePath $installer[0].FullName -ArgumentList '/S', '/currentuser' -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "Installer returned $($process.ExitCode)." }

$registry = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
$displayName = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).build.nsis.uninstallDisplayName
$entry = @(Get-ItemProperty $registry -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq $displayName })
if ($entry.Count -ne 1) { throw "Expected one Persian Counter uninstall entry; found $($entry.Count)." }
if ($entry[0].QuietUninstallString -notmatch '^"([^"]+\.exe)"(?:\s+(.*))?$') { throw 'Unexpected quiet uninstall command.' }
$uninstaller = $Matches[1]
$arguments = $Matches[2]
if (-not (Test-Path -LiteralPath $uninstaller -PathType Leaf)) { throw "Uninstaller missing: $uninstaller" }
$installDir = Split-Path -Parent $uninstaller
$application = Join-Path $installDir 'Persian Counter.exe'
if (-not (Test-Path -LiteralPath $application -PathType Leaf)) { throw 'Installed application not found.' }

# Verify that uninstall preserves user settings by default.
$settingsDir = Join-Path $env:APPDATA 'persian-counter-display'
New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
$sentinel = Join-Path $settingsDir 'uninstall-preservation-test.txt'
Set-Content -LiteralPath $sentinel -Value 'keep' -Encoding UTF8
$process = Start-Process -FilePath $uninstaller -ArgumentList $arguments -Wait -PassThru
if ($process.ExitCode -ne 0) { throw "Uninstaller returned $($process.ExitCode)." }
for ($attempt = 0; $attempt -lt 30 -and (Test-Path -LiteralPath $application); $attempt++) { Start-Sleep -Seconds 1 }
if (Test-Path -LiteralPath $application) { throw 'Application still exists after uninstall.' }
$remaining = @(Get-ItemProperty $registry -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq $displayName })
if ($remaining.Count -ne 0) { throw 'Windows uninstall entry remains after uninstall.' }
if (-not (Test-Path -LiteralPath $sentinel -PathType Leaf)) { throw 'Uninstall unexpectedly deleted user settings.' }
Write-Host 'Install, uninstall, registry cleanup and data preservation verified.'
