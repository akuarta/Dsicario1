// Constants and configuration for DSicario6 app

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://sheetlabs.com/AKTA',
  PRODUCTS_ENDPOINT: '/Dsicari0',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'DSicario',
  VERSION: '1.0.0',
  DESCRIPTION: 'E-commerce app built with React Native',
  AUTHOR: 'DSicario Team',
  EMAIL: 'contacto@dsicario.com',
  WEBSITE: 'https://dsicario.com',
};

// Navigation Routes
export const ROUTES = {
  // Main Tabs
  HOME: 'Inicio',
  CART: 'Carrito',
  PROFILE: 'Perfil',
  
  // Screens
  PRODUCT_LIST: 'ProductList',
  PRODUCT_DETAIL: 'ProductDetail',
  CART_SCREEN: 'Cart',
  CHECKOUT: 'Checkout',
  PROFILE_SCREEN: 'ProfileScreen',
};

// Screen Names (for navigation)
export const SCREEN_NAMES = {
  MAIN_TABS: 'MainTabs',
  PRODUCT_STACK: 'ProductStack',
  CART_STACK: 'CartStack',
  ...ROUTES,
};

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
};

export const PAYMENT_LABELS = {
  [PAYMENT_METHODS.CASH]: 'Efectivo',
  [PAYMENT_METHODS.CARD]: 'Tarjeta',
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

// Product Categories (can be dynamic from API)
export const PRODUCT_CATEGORIES = {
  ALL: 'all',
  ELECTRONICS: 'electronics',
  CLOTHING: 'clothing',
  FOOD: 'food',
  BOOKS: 'books',
  HOME: 'home',
  SPORTS: 'sports',
};

// Sort Options
export const SORT_OPTIONS = {
  NAME_ASC: 'name',
  PRICE_ASC: 'price-asc',
  PRICE_DESC: 'price-desc',
  CATEGORY: 'category',
  NEWEST: 'newest',
  POPULAR: 'popular',
};

export const SORT_LABELS = {
  [SORT_OPTIONS.NAME_ASC]: 'Nombre A-Z',
  [SORT_OPTIONS.PRICE_ASC]: 'Precio: Menor a Mayor',
  [SORT_OPTIONS.PRICE_DESC]: 'Precio: Mayor a Menor',
  [SORT_OPTIONS.CATEGORY]: 'Categoría',
  [SORT_OPTIONS.NEWEST]: 'Más Recientes',
  [SORT_OPTIONS.POPULAR]: 'Más Populares',
};

// UI Constants
export const UI_CONSTANTS = {
  // Grid
  MIN_PRODUCT_WIDTH: 150,
  MAX_COLUMNS: 3,
  MIN_COLUMNS: 1,
  
  // Images
  PLACEHOLDER_IMAGE: 'https://via.placeholder.com/300x200?text=Sin+Imagen',
  DEFAULT_AVATAR: 'https://via.placeholder.com/100x100?text=Usuario',
  
  // Animations
  ANIMATION_DURATION: 300,
  LOADING_DELAY: 500,
  
  // Limits
  MAX_CART_QUANTITY: 99,
  MIN_CART_QUANTITY: 1,
  MAX_SEARCH_LENGTH: 100,
  
  // Timeouts
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  SPLASH_DURATION: 2000,
};

// Error Messages
export const ERROR_MESSAGES = {
  // Network
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  TIMEOUT_ERROR: 'La solicitud tardó demasiado. Intenta de nuevo.',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
  
  // Products
  PRODUCTS_LOAD_ERROR: 'Error al cargar productos',
  PRODUCT_NOT_FOUND: 'Producto no encontrado',
  INVALID_PRODUCT: 'Producto inválido',
  
  // Cart
  CART_EMPTY: 'El carrito está vacío',
  CART_ERROR: 'Error en el carrito',
  QUANTITY_ERROR: 'Cantidad inválida',
  
  // Checkout
  CHECKOUT_ERROR: 'Error al procesar la compra',
  PAYMENT_ERROR: 'Error en el pago',
  ORDER_ERROR: 'Error al crear la orden',
  
  // General
  UNKNOWN_ERROR: 'Error desconocido',
  VALIDATION_ERROR: 'Error de validación',
  PERMISSION_ERROR: 'Sin permisos necesarios',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  PRODUCT_ADDED: 'Producto agregado al carrito',
  PRODUCT_REMOVED: 'Producto removido del carrito',
  CART_CLEARED: 'Carrito vaciado',
  ORDER_COMPLETED: 'Compra realizada con éxito',
  DATA_REFRESHED: 'Datos actualizados',
};

// Validation Rules
export const VALIDATION_RULES = {
  // Product
  PRODUCT_NAME_MIN_LENGTH: 1,
  PRODUCT_NAME_MAX_LENGTH: 100,
  PRODUCT_PRICE_MIN: 0,
  PRODUCT_PRICE_MAX: 999999,
  
  // Search
  SEARCH_MIN_LENGTH: 1,
  SEARCH_MAX_LENGTH: 100,
  
  // Cart
  CART_QUANTITY_MIN: 1,
  CART_QUANTITY_MAX: 99,
  
  // Order
  ORDER_ITEMS_MIN: 1,
  ORDER_TOTAL_MIN: 0.01,
};

// Storage Keys (for AsyncStorage)
export const STORAGE_KEYS = {
  CART: '@dsicario_cart',
  USER_PREFERENCES: '@dsicario_preferences',
  LAST_SEARCH: '@dsicario_last_search',
  FAVORITES: '@dsicario_favorites',
  ORDER_HISTORY: '@dsicario_orders',
};

// Feature Flags
export const FEATURES = {
  SEARCH_ENABLED: true,
  FAVORITES_ENABLED: false,
  REVIEWS_ENABLED: false,
  NOTIFICATIONS_ENABLED: false,
  OFFLINE_MODE_ENABLED: false,
  ANALYTICS_ENABLED: false,
  CRASH_REPORTING_ENABLED: false,
};

// Development Configuration
export const DEV_CONFIG = {
  ENABLE_LOGGING: __DEV__,
  ENABLE_DEBUG_MENU: __DEV__,
  MOCK_API_DELAY: __DEV__ ? 1000 : 0,
  SHOW_PERFORMANCE_MONITOR: __DEV__,
};

// Regular Expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  PRICE: /^\d+(\.\d{1,2})?$/,
  SEARCH: /^[a-zA-Z0-9\s\-_áéíóúñÁÉÍÓÚÑ]+$/,
};

// Default Values
export const DEFAULTS = {
  CURRENCY: 'RD$',
  LANGUAGE: 'es',
  COUNTRY: 'DO',
  TIMEZONE: 'America/Santo_Domingo',
  PAYMENT_METHOD: PAYMENT_METHODS.CASH,
  SORT_BY: SORT_OPTIONS.NAME_ASC,
  PRODUCTS_PER_PAGE: 20,
  GRID_COLUMNS: 2,
};

// Export all constants as a single object for convenience
export default {
  API_CONFIG,
  APP_CONFIG,
  ROUTES,
  SCREEN_NAMES,
  PAYMENT_METHODS,
  PAYMENT_LABELS,
  ORDER_STATUS,
  PRODUCT_CATEGORIES,
  SORT_OPTIONS,
  SORT_LABELS,
  UI_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION_RULES,
  STORAGE_KEYS,
  FEATURES,
  DEV_CONFIG,
  REGEX_PATTERNS,
  DEFAULTS,
};