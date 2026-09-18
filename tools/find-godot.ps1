<#
    Finds Godot on Windows, properly.

    play.bat's own search only looks for files called Godot*.exe in a handful of folders.
    That misses most real installs, and it missed one: a machine where Windows search
    listed Godot as an Application quite happily. Batch cannot read the registry usefully
    and cannot resolve a Start Menu shortcut at all, which is exactly what "it shows up in
    the Start menu" means. PowerShell can do both.

    Prints the full path to the best Godot it can find and exits 0.
    Prints nothing and exits 1 if there is genuinely none.

        powershell -NoProfile -ExecutionPolicy Bypass -File tools\find-godot.ps1
        ... -Verbose     to see every place it looked and what it found
#>
[CmdletBinding()]
param([switch]$All)

$found = [System.Collections.Generic.List[string]]::new()

function Add-Candidate([string]$path, [string]$where) {
    if ([string]::IsNullOrWhiteSpace($path)) { return }
    try { $path = [System.Environment]::ExpandEnvironmentVariables($path).Trim('"') } catch { return }
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return }
    if ([IO.Path]::GetExtension($path) -ne '.exe') { return }
    # The console build opens a second black window and looks broken to anyone who did
    # not choose it on purpose.
    if ([IO.Path]::GetFileNameWithoutExtension($path) -match 'console') { return }
    if ($found -notcontains $path) {
        Write-Verbose ("found via {0}: {1}" -f $where, $path)
        $found.Add($path)
    }
}

# --- 1. App Paths: what Windows itself uses to resolve "godot" typed into Run ----------
foreach ($hive in 'HKLM:', 'HKCU:') {
    foreach ($name in 'godot.exe', 'Godot.exe', 'godot4.exe') {
        $key = "$hive\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$name"
        try {
            if (Test-Path $key) {
                Add-Candidate (Get-ItemProperty $key).'(default)' 'registry App Paths'
            }
        } catch { }
    }
}

# --- 2. Installed-programs entries ------------------------------------------------------
$uninstall = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
foreach ($pattern in $uninstall) {
    try {
        Get-ItemProperty $pattern -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -like '*Godot*' } |
            ForEach-Object {
                Add-Candidate $_.DisplayIcon 'registry installed programs'
                if ($_.InstallLocation) {
                    Get-ChildItem -LiteralPath $_.InstallLocation -Filter '*.exe' `
                        -Recurse -Depth 2 -ErrorAction SilentlyContinue |
                        ForEach-Object { Add-Candidate $_.FullName 'install folder' }
                }
            }
    } catch { }
}

# --- 3. Start Menu shortcuts — this is what "it shows in Windows search" usually is -----
$menus = @(
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'),
    (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'),
    (Join-Path $env:USERPROFILE 'Desktop')
)
try {
    $shell = New-Object -ComObject WScript.Shell
    foreach ($menu in $menus) {
        if (-not (Test-Path -LiteralPath $menu)) { continue }
        Get-ChildItem -LiteralPath $menu -Filter '*odot*.lnk' -Recurse -ErrorAction SilentlyContinue |
            ForEach-Object {
                try { Add-Candidate $shell.CreateShortcut($_.FullName).TargetPath 'Start Menu shortcut' } catch { }
            }
    }
} catch { Write-Verbose "could not read shortcuts: $_" }

# --- 4. Steam, which keeps its libraries wherever the user pointed them ------------------
foreach ($steam in @("$env:ProgramFiles(x86)\Steam", "$env:ProgramFiles\Steam", "$env:LOCALAPPDATA\Steam")) {
    $vdf = Join-Path $steam 'steamapps\libraryfolders.vdf'
    $roots = @($steam)
    if (Test-Path -LiteralPath $vdf) {
        try {
            Select-String -LiteralPath $vdf -Pattern '"path"\s*"(.+?)"' -AllMatches |
                ForEach-Object { $_.Matches } |
                ForEach-Object { $roots += $_.Groups[1].Value.Replace('\\', '\') }
        } catch { }
    }
    foreach ($root in ($roots | Select-Object -Unique)) {
        $dir = Join-Path $root 'steamapps\common\Godot Engine'
        if (Test-Path -LiteralPath $dir) {
            Get-ChildItem -LiteralPath $dir -Filter '*.exe' -Recurse -Depth 2 -ErrorAction SilentlyContinue |
                ForEach-Object { Add-Candidate $_.FullName 'Steam' }
        }
    }
}

# --- 5. Package managers, and the Microsoft Store's app-execution aliases ---------------
$shims = @(
    "$env:LOCALAPPDATA\Microsoft\WindowsApps",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links",
    "$env:USERPROFILE\scoop\shims",
    "$env:ProgramData\chocolatey\bin"
)
foreach ($dir in $shims) {
    if (Test-Path -LiteralPath $dir) {
        Get-ChildItem -LiteralPath $dir -Filter '*odot*.exe' -ErrorAction SilentlyContinue |
            ForEach-Object { Add-Candidate $_.FullName 'package manager / Store alias' }
    }
}

# --- 6. The plain folders, including the two play.bat forgot ----------------------------
$dirs = @(
    (Split-Path -Parent $PSScriptRoot),
    "$env:LOCALAPPDATA\Godot", "$env:LOCALAPPDATA\Programs\Godot",
    "$env:ProgramFiles\Godot", "${env:ProgramFiles(x86)}\Godot",
    "$env:USERPROFILE\Downloads", "$env:USERPROFILE\Downloads\Godot",
    "$env:USERPROFILE\Desktop", 'C:\Godot', 'D:\Godot'
)
foreach ($dir in $dirs) {
    if ([string]::IsNullOrWhiteSpace($dir) -or -not (Test-Path -LiteralPath $dir)) { continue }
    Get-ChildItem -LiteralPath $dir -Filter '*odot*.exe' -Recurse -Depth 3 -ErrorAction SilentlyContinue |
        ForEach-Object { Add-Candidate $_.FullName 'folder scan' }
}

if ($found.Count -eq 0) { exit 1 }

if ($All) { $found | ForEach-Object { $_ }; exit 0 }

# Prefer a real 4.x: this project does not open in Godot 3.
$best = $found | Sort-Object -Property @{
    Expression = {
        $v = 0
        try {
            $fv = (Get-Item -LiteralPath $_).VersionInfo.ProductVersion
            if ($fv -match '^(\d+)') { $v = [int]$Matches[1] }
        } catch { }
        if ($v -eq 0 -and $_ -match '[_-]v?4\.') { $v = 4 }
        - $v                       # 4 before 3 before unknown
    }
}, @{ Expression = { $_.Length } } | Select-Object -First 1

$best
exit 0
