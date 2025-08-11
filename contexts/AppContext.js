import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchProducts } from '../utils/api';

// Context para productos
export const ProductsContext = createContext();

// Context para carrito
export const CartContext = createContext();

// Provider para productos
export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchProductsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching products from Google Apps Script API...');
      const data = await fetchProducts();
      
      setProducts(data);
      setLastFetch(new Date().toISOString());
      console.log(`Successfully loaded ${data.length} products`);
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
      
      // Fallback to empty array on error
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsData();
  }, []);

  // Get products by category
  const getProductsByCategory = (category) => {
    if (!category || category === 'all') return products;
    return products.filter(product => 
      product.categoria?.toLowerCase() === category.toLowerCase()
    );
  };

  // Get products by subcategory
  const getProductsBySubcategory = (subcategory) => {
    if (!subcategory || subcategory === 'all') return products;
    return products.filter(product => 
      product.subcategoria?.toLowerCase() === subcategory.toLowerCase()
    );
  };

  // Get featured products (recommended, best sellers, etc.)
  const getFeaturedProducts = () => {
    return products.filter(product => 
      product.recomendado || product.masVendido || product.delaCasa
    );
  };

  // Get products on offer
  const getOffersProducts = () => {
    return products.filter(product => 
      product.enOferta || product.descuento > 0
    );
  };

  // Get available products only
  const getAvailableProducts = () => {
    return products.filter(product => product.disponible);
  };

  // Get categories with product counts
  const getCategoriesWithCounts = () => {
    const categoryMap = {};
    products.forEach(product => {
      const category = product.categoria;
      if (category) {
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryMap).map(([name, count]) => ({
      name,
      count,
      available: products.filter(p => 
        p.categoria === name && p.disponible
      ).length
    }));
  };

  // Get product statistics
  const getProductStats = () => {
    const total = products.length;
    const available = products.filter(p => p.disponible).length;
    const outOfStock = products.filter(p => p.agotado).length;
    const onOffer = products.filter(p => p.enOferta).length;
    const recommended = products.filter(p => p.recomendado).length;
    const bestSellers = products.filter(p => p.masVendido).length;
    const houseSpecials = products.filter(p => p.delaCasa).length;
    
    return {
      total,
      available,
      outOfStock,
      onOffer,
      recommended,
      bestSellers,
      houseSpecials,
      categories: new Set(products.map(p => p.categoria).filter(Boolean)).size
    };
  };

  const value = {
    products,
    isLoading,
    error,
    lastFetch,
    refetchProducts: fetchProductsData,
    
    // Helper functions
    getProductsByCategory,
    getProductsBySubcategory,
    getFeaturedProducts,
    getOffersProducts,
    getAvailableProducts,
    getCategoriesWithCounts,
    getProductStats,
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};

// Provider para carrito
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState('cash');

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingProduct = prevCart.find(item => item.id === product.id);
      
      if (existingProduct) {
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + (product.quantity || 1) }
            : item
        );
      } else {
        return [...prevCart, { ...product, quantity: product.quantity || 1 }];
      }
    });
  };

  const removeFromCart = (productId) => {
    console.log('Intentando borrar producto del carrito con id:', productId, 'tipo:', typeof productId);
    console.log('Carrito antes de borrar:', cart);
    console.log('IDs en el carrito:', cart.map(item => ({ id: item.id, tipo: typeof item.id })));
    setCart((prevCart) => {
      const nuevoCarrito = prevCart.filter((item) => String(item.id) !== String(productId));
      console.log('Carrito después de borrar:', nuevoCarrito);
      return nuevoCarrito;
    });
  };

  const updateCartItemQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart((prevCart) =>
      prevCart.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalCost = () => {
    return cart.reduce((total, item) => {
      const price = parseFloat(item.precio) || 0;
      const discount = parseFloat(item.descuento) || 0;
      const finalPrice = discount > 0 ? price * (1 - discount / 100) : price;
      return total + (finalPrice * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalSavings = () => {
    return cart.reduce((total, item) => {
      const price = parseFloat(item.precio) || 0;
      const discount = parseFloat(item.descuento) || 0;
      if (discount > 0) {
        const savings = price * (discount / 100) * item.quantity;
        return total + savings;
      }
      return total;
    }, 0);
  };

  // Get cart summary with detailed information
  const getCartSummary = () => {
    const totalItems = getTotalItems();
    const totalCost = getTotalCost();
    const totalSavings = getTotalSavings();
    const originalTotal = cart.reduce((total, item) => {
      const price = parseFloat(item.precio) || 0;
      return total + (price * item.quantity);
    }, 0);

    return {
      items: cart,
      totalItems,
      totalCost,
      totalSavings,
      originalTotal,
      uniqueProducts: cart.length,
      isEmpty: cart.length === 0,
      hasDiscounts: totalSavings > 0
    };
  };

  // Check if product is in cart
  const isInCart = (productId) => {
    return cart.some(item => item.id === productId);
  };

  // Get quantity of specific product in cart
  const getProductQuantity = (productId) => {
    const item = cart.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    getTotalCost,
    getTotalItems,
    getTotalSavings,
    getCartSummary,
    isInCart,
    getProductQuantity,
    paymentType,
    setPaymentType
  };

  React.useEffect(() => {
    console.log('CartProvider montado. Carrito actual:', cart);
  }, [cart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hooks
export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};