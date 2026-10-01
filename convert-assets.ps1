Add-Type -AssemblyName System.Drawing

$assetsDir = "d:\Dsicario1\assets"

$conversions = @(
    @{ src = "header.jpeg";      dst = "header.png" },
    @{ src = "header_dark.jpeg"; dst = "header_dark.png" },
    @{ src = "logo.jpeg";        dst = "logo.png" },
    @{ src = "logo_dark.jpeg";   dst = "logo_dark.png" },
    @{ src = "icon.jpeg";        dst = "icon.png" },
    @{ src = "splash.jpeg";      dst = "splash.png" }
)

foreach ($conv in $conversions) {
    $srcPath = Join-Path $assetsDir $conv.src
    $dstPath = Join-Path $assetsDir $conv.dst

    if (-not (Test-Path $srcPath)) {
        Write-Host "⏭  No encontrado: $($conv.src)" -ForegroundColor Yellow
        continue
    }

    try {
        # Backup del PNG anterior si existe
        if (Test-Path $dstPath) {
            Copy-Item $dstPath ($dstPath + ".bak") -Force
            Write-Host "   💾 Backup: $($conv.dst).bak" -ForegroundColor DarkGray
        }

        # Cargar JPEG y guardar como PNG real usando .NET
        $img = [System.Drawing.Image]::FromFile((Resolve-Path $srcPath))
        $img.Save((Join-Path $assetsDir $conv.dst), [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()

        Write-Host "✅ $($conv.src)  →  $($conv.dst)" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Error con $($conv.src): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎨 Conversión completa. Los .bak son los PNG anteriores." -ForegroundColor Cyan
Write-Host "💡 Recarga Expo (r en la terminal de Expo) para ver los cambios." -ForegroundColor Cyan
