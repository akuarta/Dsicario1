import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';
// import DsicarioLogo from './DsicarioLogo'; // Removed

const { width } = Dimensions.get('window');

const FullLoadingScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Infinite progress bar loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#000000' : '#FFFFFF' }]}>
      <Animated.Image
        source={darkMode ? require('../assets/logo_dark.png') : require('../assets/logo.png')}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            borderRadius: 150, // Recorte circular para quitar el fondo visualmente
            overflow: 'hidden',
          }
        ]}
        resizeMode="contain"
      />
      <View style={styles.loaderContainer}>
        <Animated.View 
          style={[
            styles.loader, 
            { 
              backgroundColor: colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, width * 0.4]
              })
            }
          ]} 
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.45,
    height: width * 0.45,
  },
  loaderContainer: {
    width: width * 0.4,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 2,
    marginTop: 20,
    overflow: 'hidden',
  },
  loader: {
    height: '100%',
    borderRadius: 2,
  },
});

export default FullLoadingScreen;
