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

module.exports = config;