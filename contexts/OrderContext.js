import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchOrderDetails } from '../utils/api';

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOrderDetails = useCallback(async (orderId) => {
    if (!orderId) return;
    
    setOrderDetails(null);
    setLoading(true);
    setError(null);
    try {
      const details = await fetchOrderDetails(orderId);
      if (details) {
        setOrderDetails(details);
      } else {
        setError('No se pudo encontrar la información del pedido');
      }
    } catch (err) {
      setError('Error al cargar los detalles del pedido');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para refrescar los datos periódicamente si es necesario
  const refreshOrder = useCallback(async (orderId) => {
    try {
      const details = await fetchOrderDetails(orderId);
      if (details) {
        setOrderDetails(details);
      }
    } catch (err) {
      console.warn('Error en refresco automático:', err);
    }
  }, []);

  return (
    <OrderContext.Provider value={{ 
      orderDetails, 
      loading, 
      error, 
      loadOrderDetails,
      refreshOrder
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder debe usarse dentro de un OrderProvider');
  }
  return context;
};
