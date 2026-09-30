const STORAGE_KEY = '__dsicario_logger_config';
const SEEN_CATEGORIES_KEY = '__dsicario_logger_categories';

let config = {};
let seenCategories = new Set();

function loadConfig() {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    config = stored ? JSON.parse(stored) : { '*': true };
  } catch {
    config = { '*': true };
  }
}

function saveConfig() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  } catch {}
}

function loadSeenCategories() {
  try {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(SEEN_CATEGORIES_KEY) : null;
    if (stored) {
      const arr = JSON.parse(stored);
      seenCategories = new Set(arr);
    }
  } catch {
    seenCategories = new Set();
  }
}

function saveSeenCategories() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SEEN_CATEGORIES_KEY, JSON.stringify([...seenCategories]));
    }
  } catch {}
}

function extractCategory(args) {
  if (args.length > 0 && typeof args[0] === 'string') {
    const match = args[0].match(/^\[(\w[\w-]*)\]/);
    if (match) return match[1];
  }
  return '_default';
}

loadConfig();
loadSeenCategories();

export function isCategoryEnabled(category) {
  if (!config['*']) return false;
  if (category in config) return config[category];
  return true;
}

export function setCategoryEnabled(category, enabled) {
  config[category] = enabled;
  saveConfig();
}

export function setAllEnabled(enabled) {
  config['*'] = enabled;
  ALL_KNOWN_CATEGORIES.forEach(c => config[c] = enabled);
  saveConfig();
}

export function getConfig() {
  return { ...config };
}

export function getSeenCategories() {
  return [...seenCategories].sort();
}

// Pre-poblar con todos los tags [Categoria] existentes en el código
const ALL_KNOWN_CATEGORIES = [
  'AdminNotif', 'API', 'AuthContext', 'BannerNotif', 'BLACKLIST',
  'CACHE', 'CHECKOUT', 'COMISION', 'ConfigNotif', 'DEBUG',
  'DRAWER', 'FCM', 'fetchDeliveries', 'fetchOrderStatus', 'getRouteDetails',
  'INVENTARIO', 'KitchenNotif', 'Notif', 'Overlay', 'POLL',
  'PushExpo', 'PushReg', 'RESTOCK', 'RiderDebug', 'RiderHeartbeat',
  'showAlert', 'Timer', 'TOUCH', 'UPDATE', 'UpdateService',
  'USER_PRESENCE', 'UserContext', 'WebNotif', 'WhatsApp',
];
ALL_KNOWN_CATEGORIES.forEach(c => seenCategories.add(c));
saveSeenCategories();

// Monkey-patch console.log
const originalLog = console.log;
console.log = function (...args) {
  const cat = extractCategory(args);
  seenCategories.add(cat);
  saveSeenCategories();
  if (isCategoryEnabled(cat)) {
    originalLog.apply(console, args);
  }
};

const originalWarn = console.warn;
console.warn = function (...args) {
  const cat = extractCategory(args);
  seenCategories.add(cat);
  saveSeenCategories();
  if (isCategoryEnabled(cat)) {
    originalWarn.apply(console, args);
  }
};

const originalError = console.error;
console.error = function (...args) {
  const cat = extractCategory(args);
  seenCategories.add(cat);
  saveSeenCategories();
  if (isCategoryEnabled(cat)) {
    originalError.apply(console, args);
  }
};
