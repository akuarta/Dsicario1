// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// ── Serve service worker files as static JS (Metro SPA fallback los intercepta) ──
const SW_ROUTES = {
  '/service-worker.js': path.join(__dirname, 'web', 'service-worker.js'),
  '/firebase-messaging-sw.js': path.join(__dirname, 'web', 'firebase-messaging-sw.js'),
};

if (config.server?.enhanceMiddleware) {
  const original = config.server.enhanceMiddleware;
  config.server.enhanceMiddleware = (metroMiddleware) => {
    const enhanced = original(metroMiddleware);
    return (req, res, next) => {
      const swFile = SW_ROUTES[req.url];
      if (swFile && fs.existsSync(swFile)) {
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Service-Worker-Allowed', '/');
        res.end(fs.readFileSync(swFile, 'utf8'));
        return;
      }
      return enhanced(req, res, next);
    };
  };
}

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
    unstable_enablePackageExports: false,
  },
});

// ── Excluir intermedios de CMake/Gradle del watcher y del resolver ──
// El build nativo genera y borra directorios .cxx/CMakeTmp dentro de
// node_modules mientras Metro observa: el watcher crashea con ENOENT.
// Estos archivos nunca son JS empaquetable, así que se ignoran siempre.
{
  const prev = config.resolver.blockList;
  const prevSources = !prev ? [] : Array.isArray(prev) ? prev.map((r) => r.source) : [prev.source];
  const extra = [/.*\/\.cxx\/.*/, /.*\/build\/intermediates\/.*/, /.*\/CMakeFiles\/.*/];
  const sources = [...prevSources, ...extra.map((r) => r.source)];
  config.resolver.blockList = new RegExp(`(${sources.join(')|(')})`);
}

module.exports = config;