// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
    unstable_enablePackageExports: false,
  },
});

module.exports = config;

// Add proxy configuration for web development
config.web = {
  ...config.web,
  devServer: {
    proxy: {
      '/api': {
        target: 'https://script.google.com/macros/s/AKfycbwxwGTHqRU5HUDACsWRukCTorrLX-52WeDKIQoek4ylPqgRzCQQ7qlwL5FldFqChP38/exec',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
      },
    },
  },
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
    unstable_enablePackageExports: false,
  },
});

module.exports = config;