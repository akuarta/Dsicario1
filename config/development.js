// Development configuration for DSicario6

export const DEV_CONFIG = {
  // API Configuration
  API: {
    ENABLE_MOCK_DATA: false,
    MOCK_DELAY: 1000,
    ENABLE_API_LOGGING: true,
    TIMEOUT: 10000,
  },

  // Performance Monitoring
  PERFORMANCE: {
    ENABLE_FLIPPER: __DEV__,
    ENABLE_PERFORMANCE_MONITOR: __DEV__,
    LOG_RENDER_TIMES: __DEV__,
    TRACK_MEMORY_USAGE: __DEV__,
  },

  // Debugging
  DEBUG: {
    ENABLE_REDUX_LOGGER: __DEV__,
    ENABLE_NETWORK_INSPECTOR: __DEV__,
    SHOW_DEBUG_INFO: __DEV__,
    ENABLE_HOT_RELOAD: __DEV__,
  },

  // UI Development
  UI: {
    SHOW_COMPONENT_BORDERS: false,
    ENABLE_LAYOUT_ANIMATION: true,
    SHOW_PERFORMANCE_OVERLAY: false,
    ENABLE_ACCESSIBILITY_INSPECTOR: __DEV__,
  },

  // Feature Flags for Development
  FEATURES: {
    ENABLE_EXPERIMENTAL_FEATURES: __DEV__,
    ENABLE_BETA_FEATURES: false,
    MOCK_PAYMENT_SUCCESS: __DEV__,
    SKIP_ONBOARDING: __DEV__,
  },

  // Logging Configuration
  LOGGING: {
    LEVEL: __DEV__ ? 'debug' : 'error',
    ENABLE_CONSOLE_LOGS: __DEV__,
    ENABLE_CRASH_REPORTING: !__DEV__,
    LOG_API_REQUESTS: __DEV__,
    LOG_NAVIGATION: __DEV__,
  },
};

// Mock data for development
export const MOCK_PRODUCTS = [
  {
    id: '1',
    nombre: 'Producto Demo 1',
    descripcion: 'Descripción del producto demo para desarrollo',
    precio: 99.99,
    categoria: 'Electrónicos',
    imagen: 'https://picsum.photos/300/200?random=1'
  },
  {
    id: '2',
    nombre: 'Producto Demo 2',
    descripcion: 'Otro producto demo para pruebas',
    precio: 149.99,
    categoria: 'Ropa',
    imagen: 'https://picsum.photos/300/200?random=2'
  },
  {
    id: '3',
    nombre: 'Producto Demo 3',
    descripcion: 'Tercer producto para testing',
    precio: 79.99,
    categoria: 'Hogar',
    imagen: 'https://picsum.photos/300/200?random=3'
  },
];

// Development utilities
export const DevUtils = {
  // Log performance metrics
  logPerformance: (componentName, renderTime) => {
    if (DEV_CONFIG.PERFORMANCE.LOG_RENDER_TIMES) {
      console.log(`[PERF] ${componentName} rendered in ${renderTime}ms`);
    }
  },

  // Log API calls
  logApiCall: (endpoint, method, duration) => {
    if (DEV_CONFIG.LOGGING.LOG_API_REQUESTS) {
      console.log(`[API] ${method} ${endpoint} - ${duration}ms`);
    }
  },

  // Log navigation events
  logNavigation: (from, to) => {
    if (DEV_CONFIG.LOGGING.LOG_NAVIGATION) {
      console.log(`[NAV] ${from} -> ${to}`);
    }
  },

  // Mock API delay
  mockDelay: (ms = DEV_CONFIG.API.MOCK_DELAY) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Generate mock data
  generateMockProducts: (count = 10) => {
    return Array.from({ length: count }, (_, index) => ({
      id: (index + 1).toString(),
      nombre: `Producto Mock ${index + 1}`,
      descripcion: `Descripción del producto mock ${index + 1}`,
      precio: Math.floor(Math.random() * 200) + 10,
      categoria: ['Electrónicos', 'Ropa', 'Hogar', 'Deportes'][Math.floor(Math.random() * 4)],
      imagen: `https://picsum.photos/300/200?random=${index + 1}`
    }));
  },
};

export default DEV_CONFIG;