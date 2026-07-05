# Firebase Deploy Skill

Build, upload, and distribute APK updates for DSicario.

## Flujo completo de actualización

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

### 4. Subir a Firebase App Distribution
```bash
npx firebase appdistribution:distribute "C:\Hairo\Actualizacion\DSicario_$date.apk" --app "1:758740272138:android:c375b77acc20d7081d8bf3" --testers "hairoman28@gmail.com"
```

### 5. Subir APK a Firebase Storage (URL permanente)
```bash
# Usar Firebase Console o gsutil:
gsutil cp "C:\Hairo\Actualizacion\DSicario_$date.apk" gs://dsicario-cd723.firebasestorage.app/
```

### 6. Actualizar Firestore version_control
**Firebase Console** → Firestore Database → `app_config/version_control`:

| Campo | Valor |
|-------|-------|
| `latest_version` | Nueva versión (ej: `1.1.1`) |
| `download_url` | URL del APK en Firebase Storage |
| `release_notes` | Descripción de los cambios |
| `force_update` | `false` (o `true` si es obligatoria) |

**Importante**: `latest_version` debe ser MAYOR que `Constants.expoConfig.version` en `app.json` para que la app detecte la actualización.

### 7. Versión en app.json
Después de cada release, actualizar la versión en `app.json`:
```json
"version": "1.1.1"
```

## Configuración del proyecto
- **Firebase Project**: `dsicario-cd723`
- **App ID**: `1:758740272138:android:c375b77acc20d7081d8bf3`
- **Storage Bucket**: `dsicario-cd723.firebasestorage.app`
- **Tester**: `hairoman28@gmail.com`
- **Update folder**: `C:\Hairo\Actualizacion\`

## UpdateService.js
La app detecta actualizaciones consultando Firestore `app_config/version_control`:
- Compara `latest_version` con `Constants.expoConfig.version`
- Si hay nueva versión → muestra alerta con opción de descargar
- `download_url` → abre en navegador para descargar APK
