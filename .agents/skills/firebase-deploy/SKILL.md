# Firebase Deploy Skill

Build, upload, and distribute APK updates for DSicario.

## Flujo completo de actualización (automatizado)

### 1. Commit
```bash
git add -A
git commit -m "feat: descripción del cambio"
```

### 2. Build APK
```powershell
Start-Process -FilePath "cmd.exe" -ArgumentList "/c cd C:\Hairo\Dsicario1\android && gradlew.bat assembleRelease > C:\Hairo\Dsicario1\build-output.log 2>&1" -NoNewWindow -Wait
```
El APK queda en: `android\app\build\outputs\apk\release\app-release.apk`

### 3. Copiar a carpeta de actualización
```powershell
$date = Get-Date -Format "yyyy-MM-dd_HH-mm"
Copy-Item "C:\Hairo\Dsicario1\android\app\build\outputs\apk\release\app-release.apk" "C:\Hairo\Actualizacion\DSicario_$date.apk"
```

### 4. Crear GitHub Release
```bash
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
git tag -a v$version -m "v$version - notas"
git push origin v$version
gh release create v$version "C:\Hairo\Actualizacion\DSicario_$date.apk" --title "v$version" --notes "notas"
gh release edit v$version --draft=false
```

### 5. Subir a Firebase App Distribution
```bash
npx firebase appdistribution:distribute "C:\Hairo\Actualizacion\DSicario_$date.apk" --app "1:758740272138:android:c375b77acc20d7081d8bf3" --testers "hairoman28@gmail.com"
```

### 6. Actualizar Firestore (AUTOMÁTICO)
```bash
node updateFirestore.js "$version" "https://github.com/akuarta/Dsicario1/releases/download/v$version/DSicario_$date.apk" "release notes"
```
Esto actualiza `app_config/version_control` con:
- `latest_version`
- `download_url` (GitHub release URL)
- `release_notes`
- `force_update`

**Importante**: La versión en `app.json` DEBE ser la misma que se pasa al script.

## Configuración del proyecto
- **Firebase Project**: `dsicario-cd723`
- **App ID**: `1:758740272138:android:c375b77acc20d7081d8bf3`
- **Storage Bucket**: `dsicario-cd723.firebasestorage.app`
- **Tester**: `hairoman28@gmail.com`
- **Update folder**: `C:\Hairo\Actualizacion\`
- **Service Account**: `config/firebaseServiceAccount.json` (en .gitignore)

## UpdateService.js
La app detecta actualizaciones consultando Firestore `app_config/version_control`:
- Compara `latest_version` con `Constants.expoConfig.version`
- Si hay nueva versión → muestra alerta con opción de descargar
- `download_url` → usa Android download manager (IntentLauncher)

## Archivos importantes
- `updateFirestore.js` — script para actualizar Firestore automáticamente
- `config/firebaseServiceAccount.json` — credenciales (NO subir a git)
