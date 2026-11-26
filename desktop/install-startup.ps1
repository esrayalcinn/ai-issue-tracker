$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "MavisDesktopPet.lnk"
$vbsPath = Join-Path $PSScriptRoot "launch-silent.vbs"
$iconPath = Join-Path $PSScriptRoot "mavis.ico"

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($shortcutPath)
$sc.TargetPath = "wscript.exe"
$sc.Arguments = "`"$vbsPath`""
$sc.WorkingDirectory = $PSScriptRoot
$sc.IconLocation = "$iconPath,0"
$sc.Description = "Start Mavis desktop pet automatically with Windows"
$sc.Save()

Write-Output "Added Mavis to Windows Startup: $shortcutPath"
