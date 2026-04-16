Add-Type -AssemblyName System.Drawing
$jpgPath = Resolve-Path "assets\logo_backup.jpg"
$pngPath = Join-Path (Get-Location) "assets\logo.png"
$img = [System.Drawing.Image]::FromFile($jpgPath.Path)
$img.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Host "PNG convertido OK en: $pngPath"
$buf = [System.IO.File]::ReadAllBytes($pngPath)
$b0 = $buf[0].ToString("X2")
$b1 = $buf[1].ToString("X2")
Write-Host "Primeros bytes: $b0 $b1 (debe ser 89 50 para PNG)"
