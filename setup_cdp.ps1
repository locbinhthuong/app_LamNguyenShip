Write-Host "=== Antigravity CDP Setup ===" -ForegroundColor Cyan
Write-Host "Searching for Antigravity shortcuts..." -ForegroundColor Yellow

# Define search locations
$searchLocations = @(
    [Environment]::GetFolderPath('Desktop'),
    "$env:USERPROFILE\Desktop",
    "$env:USERPROFILE\OneDrive\Desktop",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$env:USERPROFILE\AppData\Roaming\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar"
)

$WshShell = New-Object -ComObject WScript.Shell
$foundShortcuts = @()

# Search for shortcuts
foreach ($location in $searchLocations) {
    if (Test-Path $location) {
        Write-Host "Searching: $location"
        $shortcuts = Get-ChildItem -Path $location -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like "*Antigravity*" }
        $foundShortcuts += $shortcuts
    }
}

if ($foundShortcuts.Count -eq 0) {
    Write-Host "No shortcuts found. Searching for Antigravity installation..." -ForegroundColor Yellow
    $exePath = "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe"

    if (Test-Path $exePath) {
        $desktopPath = [Environment]::GetFolderPath('Desktop')
        $shortcutPath = "$desktopPath\Antigravity.lnk"
        $shortcut = $WshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $exePath
        $shortcut.Arguments = "--remote-debugging-port=9000"
        $shortcut.Save()
        Write-Host "Created new shortcut: $shortcutPath" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Antigravity.exe not found. Please install Antigravity first." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Found $($foundShortcuts.Count) shortcut(s)" -ForegroundColor Green
    foreach ($shortcutFile in $foundShortcuts) {
        $shortcut = $WshShell.CreateShortcut($shortcutFile.FullName)
        $originalArgs = $shortcut.Arguments

        if ($originalArgs -match "--remote-debugging-port=\d+") {
            $shortcut.Arguments = $originalArgs -replace "--remote-debugging-port=\d+", "--remote-debugging-port=9000"
        } else {
            $shortcut.Arguments = "--remote-debugging-port=9000 " + $originalArgs
        }
        $shortcut.Save()
        Write-Host "Updated: $($shortcutFile.Name)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "Please restart Antigravity completely for changes to take effect." -ForegroundColor Yellow
