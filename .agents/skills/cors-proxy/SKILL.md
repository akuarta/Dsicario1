# CORS Proxy Skill

Este Skill define cómo manejar y evitar los problemas de "Cross-Origin Resource Sharing" (CORS) durante el desarrollo local en la web, especialmente cuando la aplicación consume la API de Google Apps Script (que suele bloquear o presentar problemas con redirecciones en el navegador por políticas CORS).

## 🚀 Cómo Iniciar el Proxy

El proxy local está basado en `cors-anywhere` y corre sobre un servidor Node.js. Para usarlo:

1. Abre una terminal.
2. Ve a esta carpeta: `cd c:\Dsicario1\.agents\skills\cors-proxy\`
3. Si es la primera vez, instala las dependencias: `npm install`
4. Inicia el servidor: `npm start`
5. El proxy estará corriendo en `http://localhost:8080`.

## 📏 Reglas de Oro para Agentes

1. **Uso Exclusivo en Desarrollo Web**: Los problemas de CORS generalmente solo se presentan al ejecutar la aplicación en el navegador (`npm run web`). En aplicaciones nativas (Android/iOS), React Native no aplica restricciones CORS, por lo que las peticiones se deben hacer directamente.
2. **Cómo Modificar el Endpoint**: Cuando estés trabajando en el frontend web y necesites saltar el bloqueo de CORS, debes modificar temporalmente la URL destino usando el proxy. El formato es `http://localhost:8080/URL_DESTINO`.
   
   Ejemplo:
   ```javascript
   // Petición Original que falla por CORS:
   const url = "https://script.google.com/macros/s/AKfycby.../exec";
   
   // Petición a través del Proxy para desarrollo web:
   const url = "http://localhost:8080/https://script.google.com/macros/s/AKfycby.../exec";
   ```
3. **No subas configuraciones de Proxy a Producción**: El proxy solo sirve para facilitar tu flujo de desarrollo local. Antes de compilar para producción o enviar a Git, recuerda revertir las peticiones para que no usen `localhost:8080` de por medio.
4. **Validación**: Para consumir Google Apps Script, asegúrate de que pasas los headers necesarios o usas solicitudes de tipo `POST` con `text/plain` para evitar peticiones `OPTIONS` (preflight) si no estás usando el proxy.
