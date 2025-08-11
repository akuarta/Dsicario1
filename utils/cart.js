// Cart utilities for DSicario6 app

/**
 * Calculate total cost of cart items
 * @param {Array} cartItems - Array of cart items
 * @returns {number} Total cost
 */
export const calculateCartTotal = (cartItems) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return 0;
  }
  
  return cartItems.reduce((total, item) => {
    const price = parseFloat(item.precio) || 0;
    const quantity = parseInt(item.quantity) || 0;
    return total + (price * quantity);
  }, 0);
};

/**
 * Calculate total number of items in cart
 * @param {Array} cartItems - Array of cart items
 * @returns {number} Total items count
 */
export const calculateCartItemCount = (cartItems) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return 0;
  }
  
  return cartItems.reduce((total, item) => {
    const quantity = parseInt(item.quantity) || 0;
    return total + quantity;
  }, 0);
};

/**
 * Find item in cart by ID
 * @param {Array} cartItems - Array of cart items
 * @param {string|number} productId - Product ID to find
 * @returns {Object|null} Found item or null
 */
export const findCartItem = (cartItems, productId) => {
  if (!Array.isArray(cartItems) || !productId) {
    return null;
  }
  
  return cartItems.find(item => 
    item.id?.toString() === productId.toString()
  ) || null;
};

/**
 * Add item to cart or update quantity if exists
 * @param {Array} cartItems - Current cart items
 * @param {Object} product - Product to add
 * @param {number} quantity - Quantity to add
 * @returns {Array} Updated cart items
 */
export const addToCart = (cartItems, product, quantity = 1) => {
  if (!product || !product.id) {
    console.warn('Invalid product provided to addToCart');
    return cartItems;
  }
  
  const existingItem = findCartItem(cartItems, product.id);
  
  if (existingItem) {
    // Update existing item quantity
    return cartItems.map(item =>
      item.id?.toString() === product.id?.toString()
        ? { ...item, quantity: item.quantity + quantity }
        : item
    );
  } else {
    // Add new item to cart
    return [...cartItems, { ...product, quantity }];
  }
};

/**
 * Remove item from cart completely
 * @param {Array} cartItems - Current cart items
 * @param {string|number} productId - Product ID to remove
 * @returns {Array} Updated cart items
 */
export const removeFromCart = (cartItems, productId) => {
  if (!Array.isArray(cartItems) || !productId) {
    return cartItems;
  }
  
  return cartItems.filter(item => 
    item.id?.toString() !== productId.toString()
  );
};

/**
 * Update item quantity in cart
 * @param {Array} cartItems - Current cart items
 * @param {string|number} productId - Product ID to update
 * @param {number} newQuantity - New quantity
 * @returns {Array} Updated cart items
 */
export const updateCartItemQuantity = (cartItems, productId, newQuantity) => {
  if (!Array.isArray(cartItems) || !productId) {
    return cartItems;
  }
  
  const quantity = parseInt(newQuantity) || 0;
  
  if (quantity <= 0) {
    return removeFromCart(cartItems, productId);
  }
  
  return cartItems.map(item =>
    item.id?.toString() === productId.toString()
      ? { ...item, quantity }
      : item
  );
};

/**
 * Clear all items from cart
 * @returns {Array} Empty array
 */
export const clearCart = () => {
  return [];
};

/**
 * Validate cart item
 * @param {Object} item - Cart item to validate
 * @returns {boolean} True if valid
 */
export const validateCartItem = (item) => {
  if (!item || typeof item !== 'object') {
    return false;
  }
  
  const requiredFields = ['id', 'nombre', 'precio', 'quantity'];
  
  return requiredFields.every(field => {
    if (!item.hasOwnProperty(field)) {
      return false;
    }
    
    if (field === 'quantity') {
      return Number.isInteger(item[field]) && item[field] > 0;
    }
    
    if (field === 'precio') {
      return !isNaN(parseFloat(item[field])) && parseFloat(item[field]) >= 0;
    }
    
    return item[field] !== null && item[field] !== undefined && item[field] !== '';
  });
};

/**
 * Get cart summary
 * @param {Array} cartItems - Array of cart items
 * @returns {Object} Cart summary
 */
export const getCartSummary = (cartItems) => {
  const validItems = cartItems.filter(validateCartItem);
  const totalItems = calculateCartItemCount(validItems);
  const totalCost = calculateCartTotal(validItems);
  const uniqueProducts = validItems.length;
  
  return {
    items: validItems,
    totalItems,
    totalCost,
    uniqueProducts,
    isEmpty: validItems.length === 0,
    isValid: validItems.length === cartItems.length
  };
};

/**
 * Format cart for checkout
 * @param {Array} cartItems - Array of cart items
 * @param {string} paymentMethod - Payment method
 * @returns {Object} Formatted checkout data
 */
export const formatCartForCheckout = (cartItems, paymentMethod = 'cash') => {
  const summary = getCartSummary(cartItems);
  
  return {
    items: summary.items.map(item => ({
      id: item.id,
      name: item.nombre,
      price: parseFloat(item.precio),
      quantity: item.quantity,
      subtotal: parseFloat(item.precio) * item.quantity
    })),
    summary: {
      totalItems: summary.totalItems,
      totalCost: summary.totalCost,
      uniqueProducts: summary.uniqueProducts
    },
    paymentMethod,
    timestamp: new Date().toISOString()
  };
};

/**
 * Save cart to storage (placeholder for future implementation)
 * @param {Array} cartItems - Cart items to save
 * @returns {Promise<boolean>} Success status
 */
export const saveCartToStorage = async (cartItems) => {
  try {
    // TODO: Implement AsyncStorage or other persistence
    console.log('Cart saved to storage:', cartItems);
    return true;
  } catch (error) {
    console.error('Error saving cart to storage:', error);
    return false;
  }
};

/**
 * Load cart from storage (placeholder for future implementation)
 * @returns {Promise<Array>} Loaded cart items
 */
export const loadCartFromStorage = async () => {
  try {
    // TODO: Implement AsyncStorage or other persistence
    console.log('Loading cart from storage');
    return [];
  } catch (error) {
    console.error('Error loading cart from storage:', error);
    return [];
  }
};

export default {
  calculateCartTotal,
  calculateCartItemCount,
  findCartItem,
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  validateCartItem,
  getCartSummary,
  formatCartForCheckout,
  saveCartToStorage,
  loadCartFromStorage
};