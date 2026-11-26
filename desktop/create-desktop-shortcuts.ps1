$desktopDir = [Environment]::GetFolderPath("Desktop")
$ws = New-Object -ComObject WScript.Shell

$startShortcut = $ws.CreateShortcut((Join-Path $desktopDir "Start Mavis.lnk"))
$startShortcut.TargetPath = "wscript.exe"
$startShortcut.Arguments = "`"$(Join-Path $PSScriptRoot 'launch-silent.vbs')`""
$startShortcut.WorkingDirectory = $PSScriptRoot
$startShortcut.IconLocation = "$(Join-Path $PSScriptRoot 'mavis.ico'),0"
$startShortcut.Description = "Launch Mavis desktop pet"
$startShortcut.Save()

Write-Output "Created 'Start Mavis' desktop shortcut!"
