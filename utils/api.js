// API utilities for DSicario6 app - Updated for Google Apps Script API

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwxwGTHqRU5HUDACsWRukCTorrLX-52WeDKIQoek4ylPqgRzCQQ7qlwL5FldFqChP38/exec';
const PRODUCTS_ENDPOINT = `${API_BASE_URL}/exec`;

// API response timeout
const API_TIMEOUT = 15000; // Increased for Google Apps Script

/**
 * Custom fetch with timeout
 */
const fetchWithTimeout = (url, options = {}, timeout = API_TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

/**
 * Map API product data to app format
 * @param {Object} apiProduct - Raw product from Google Apps Script API
 * @returns {Object} Mapped product for app use
 */
const mapProductData = (apiProduct) => {
  return {
    id: apiProduct.ID_Producto || Math.random().toString(),
    nombre: apiProduct.nombre || 'Producto sin nombre',
    descripcion: apiProduct.subcategoria 
      ? `${apiProduct.categoria} - ${apiProduct.subcategoria}`
      : apiProduct.categoria || 'Sin descripción',
    precio: parseFloat(apiProduct.precio) || 0,
    categoria: apiProduct.categoria || 'Sin categoría',
    subcategoria: apiProduct.subcategoria || '',
    imagen: apiProduct.imagen || 'https://via.placeholder.com/300x200?text=Sin+Imagen',
    
    // Estados del producto
    disponible: !apiProduct.agotado,
    agotado: apiProduct.agotado || false,
    masVendido: apiProduct.masVendidos || false,
    delaCasa: apiProduct.delaCasa || false,
    enOferta: apiProduct.enOferta || false,
    recomendado: apiProduct.recomendados || false,
    
    // Información adicional
    rating: parseInt(apiProduct.rating) || 0,
    descuento: parseFloat(apiProduct.descuento) || 0,
    cantidad: apiProduct.cantidad || '',
    itebis: apiProduct.itebis || '',
    
    // Estados internos de la app
    enCarrito: apiProduct.carrito || false,
    agregarAdicionales: apiProduct.agregarediccion || false
  };
};

/**
 * Fetch products from Google Apps Script API
 * @returns {Promise<Array>} Array of products
 */
export const fetchProducts = async () => {
  try {
    console.log('Fetching products from Google Apps Script API...');

    const response = await fetchWithTimeout(PRODUCTS_ENDPOINT, {
      method: 'GET',
      // ❌ No pongas headers aquí o fallará con CORS
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    console.log('Raw API response:', rawData);

    // ✅ Lee desde rawData.Producto
    const productsData = rawData.Producto;

    if (!Array.isArray(productsData)) {
      throw new Error('Invalid data format: expected array at data.Producto');
    }

    const mappedProducts = productsData
      .map(mapProductData)
      .filter(product => product.id && product.nombre);

    console.log(`Successfully mapped ${mappedProducts.length} products`);
    return mappedProducts;

  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error(`Failed to fetch products: ${error.message}`);
  }
};


/**
 * Search products by term (enhanced for new fields)
 * @param {Array} products - Array of products
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered products
 */
export const searchProducts = (products, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) {
    return products;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return products.filter(product => 
    (product.nombre || '').toLowerCase().includes(term) ||
    (product.categoria || '').toLowerCase().includes(term) ||
    (product.subcategoria || '').toLowerCase().includes(term) ||
    (product.descripcion || '').toLowerCase().includes(term)
  );
};

/**
 * Filter products by category
 * @param {Array} products - Array of products
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered products
 */
export const filterProductsByCategory = (products, category) => {
  if (!category || category === 'all') {
    return products;
  }
  
  return products.filter(product => 
    (product.categoria || '').toLowerCase() === category.toLowerCase()
  );
};

/**
 * Filter products by subcategory
 * @param {Array} products - Array of products
 * @param {string} subcategory - Subcategory to filter by
 * @returns {Array} Filtered products
 */
export const filterProductsBySubcategory = (products, subcategory) => {
  if (!subcategory || subcategory === 'all') {
    return products;
  }
  
  return products.filter(product => 
    (product.subcategoria || '').toLowerCase() === subcategory.toLowerCase()
  );
};

/**
 * Advanced filters for new API fields
 */
export const advancedFilters = {
  disponibles: (products) => products.filter(p => p.disponible),
  agotados: (products) => products.filter(p => p.agotado),
  masVendidos: (products) => products.filter(p => p.masVendido),
  delaCasa: (products) => products.filter(p => p.delaCasa),
  enOferta: (products) => products.filter(p => p.enOferta),
  recomendados: (products) => products.filter(p => p.recomendado),
  conDescuento: (products) => products.filter(p => p.descuento > 0),
  porRating: (products, minRating = 4) => products.filter(p => p.rating >= minRating),
};

/**
 * Sort products by different criteria (enhanced)
 * @param {Array} products - Array of products
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted products
 */
export const sortProducts = (products, sortBy) => {
  const sortedProducts = [...products];
  
  switch (sortBy) {
    case 'name':
      return sortedProducts.sort((a, b) => 
        (a.nombre || '').localeCompare(b.nombre || '')
      );
      
    case 'price-asc':
      return sortedProducts.sort((a, b) => 
        parseFloat(a.precio || 0) - parseFloat(b.precio || 0)
      );
      
    case 'price-desc':
      return sortedProducts.sort((a, b) => 
        parseFloat(b.precio || 0) - parseFloat(a.precio || 0)
      );
      
    case 'category':
      return sortedProducts.sort((a, b) => 
        (a.categoria || '').localeCompare(b.categoria || '')
      );
      
    case 'rating':
      return sortedProducts.sort((a, b) => 
        (b.rating || 0) - (a.rating || 0)
      );
      
    case 'popular':
      return sortedProducts.sort((a, b) => {
        // Prioritize: masVendido > recomendado > rating > name
        if (a.masVendido !== b.masVendido) return b.masVendido - a.masVendido;
        if (a.recomendado !== b.recomendado) return b.recomendado - a.recomendado;
        if (a.rating !== b.rating) return b.rating - a.rating;
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
      
    case 'offers':
      return sortedProducts.sort((a, b) => {
        // Prioritize: enOferta > descuento > price
        if (a.enOferta !== b.enOferta) return b.enOferta - a.enOferta;
        if (a.descuento !== b.descuento) return b.descuento - a.descuento;
        return parseFloat(a.precio || 0) - parseFloat(b.precio || 0);
      });
      
    default:
      return sortedProducts;
  }
};

/**
 * Get unique categories from products
 * @param {Array} products - Array of products
 * @returns {Array} Array of unique categories
 */
export const getCategories = (products) => {
  const categories = products
    .map(product => product.categoria)
    .filter(category => category && category.trim())
    .map(category => category.trim());
    
  return [...new Set(categories)].sort();
};

/**
 * Get unique subcategories from products
 * @param {Array} products - Array of products
 * @param {string} category - Optional category filter
 * @returns {Array} Array of unique subcategories
 */
export const getSubcategories = (products, category = null) => {
  let filteredProducts = products;
  
  if (category) {
    filteredProducts = products.filter(p => 
      (p.categoria || '').toLowerCase() === category.toLowerCase()
    );
  }
  
  const subcategories = filteredProducts
    .map(product => product.subcategoria)
    .filter(subcategory => subcategory && subcategory.trim())
    .map(subcategory => subcategory.trim());
    
  return [...new Set(subcategories)].sort();
};

/**
 * Get product statistics
 * @param {Array} products - Array of products
 * @returns {Object} Statistics object
 */
export const getProductStats = (products) => {
  const total = products.length;
  const disponibles = products.filter(p => p.disponible).length;
  const agotados = products.filter(p => p.agotado).length;
  const enOferta = products.filter(p => p.enOferta).length;
  const masVendidos = products.filter(p => p.masVendido).length;
  const recomendados = products.filter(p => p.recomendado).length;
  const delaCasa = products.filter(p => p.delaCasa).length;
  
  const avgRating = products.reduce((sum, p) => sum + (p.rating || 0), 0) / total;
  const avgPrice = products.reduce((sum, p) => sum + (parseFloat(p.precio) || 0), 0) / total;
  
  return {
    total,
    disponibles,
    agotados,
    enOferta,
    masVendidos,
    recomendados,
    delaCasa,
    avgRating: Math.round(avgRating * 10) / 10,
    avgPrice: Math.round(avgPrice * 100) / 100,
    categories: getCategories(products).length,
    subcategories: getSubcategories(products).length
  };
};

/**
 * Validate product data (enhanced)
 * @param {Object} product - Product object
 * @returns {boolean} True if valid
 */
export const validateProduct = (product) => {
  if (!product || typeof product !== 'object') {
    return false;
  }
  
  const requiredFields = ['id', 'nombre', 'precio'];
  
  return requiredFields.every(field => 
    product.hasOwnProperty(field) && 
    product[field] !== null && 
    product[field] !== undefined &&
    product[field] !== ''
  );
};

/**
 * Format price for display
 * @param {number|string} price - Price value
 * @param {string} currency - Currency symbol
 * @returns {string} Formatted price
 */
export const formatPrice = (price, currency = 'RD$') => {
  const numPrice = parseFloat(price) || 0;
  return `${currency}${numPrice.toFixed(2)}`;
};

/**
 * Calculate discounted price
 * @param {number} price - Original price
 * @param {number} discount - Discount percentage
 * @returns {number} Discounted price
 */
export const calculateDiscountedPrice = (price, discount) => {
  const originalPrice = parseFloat(price) || 0;
  const discountPercent = parseFloat(discount) || 0;
  
  if (discountPercent <= 0) return originalPrice;
  
  return originalPrice * (1 - discountPercent / 100);
};

/**
 * Generate order number
 * @returns {string} Order number
 */
export const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `DS${timestamp.slice(-6)}${random}`;
};

export default {
  fetchProducts,
  searchProducts,
  filterProductsByCategory,
  filterProductsBySubcategory,
  advancedFilters,
  sortProducts,
  getCategories,
  getSubcategories,
  getProductStats,
  validateProduct,
  formatPrice,
  calculateDiscountedPrice,
  generateOrderNumber,
  mapProductData
};