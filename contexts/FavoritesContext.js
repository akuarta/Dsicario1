import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const STORAGE_KEY = '@dsicario_favorites';

  // Cargar favoritos del storage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const savedFavorites = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }
      } catch (err) {
        console.error('Error loading favorites:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadFavorites();
  }, []);

  // Guardar favoritos en storage
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favorites)).catch(err => 
        console.error('Error saving favorites:', err)
      );
    }
  }, [favorites, isLoaded]);

  const addToFavorites = useCallback((product) => {
    setFavorites(prevFavorites => {
      const exists = prevFavorites.some(fav => fav.id === product.id);
      if (exists) return prevFavorites;
      return [...prevFavorites, { 
        ...product, 
        addedAt: new Date().toISOString() 
      }];
    });
  }, []);

  const removeFromFavorites = useCallback((productId) => {
    setFavorites(prevFavorites => 
      prevFavorites.filter(fav => fav.id !== productId)
    );
  }, []);

  const toggleFavorite = useCallback((product) => {
    const isFavorite = favorites.some(fav => fav.id === product.id);
    if (isFavorite) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  }, [favorites, addToFavorites, removeFromFavorites]);

  const isFavorite = useCallback((productId) => {
    return favorites.some(fav => fav.id === productId);
  }, [favorites]);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  const getFavoritesCount = useCallback(() => {
    return favorites.length;
  }, [favorites]);

  const value = {
    favorites,
    isLoaded,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    getFavoritesCount,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites debe usarse dentro de un FavoritesProvider');
  }
  return context;
};

export default FavoritesContext;
