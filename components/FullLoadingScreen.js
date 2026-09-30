import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { getThemeColors } from '../theme/theme';
import { useThemeMode } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');
const LOGO_SIZE = Math.min(width, height) * 0.72;

const FullLoadingScreen = () => {
  const { darkMode } = useThemeMode();
  const colors = getThemeColors(darkMode);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1400,
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
    <View style={[styles.container, { backgroundColor: darkMode ? '#0D0D0D' : '#F8F8F8' }]}>
      {/* Logo centrado grande */}
      <Animated.Image
        source={darkMode ? require('../assets/logo_dark.png') : require('../assets/logo.png')}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
        resizeMode="contain"
      />
      {/* Barra de carga */}
      <View style={styles.loaderContainer}>
        <Animated.View
          style={[
            styles.loader,
            {
              backgroundColor: colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, width * 0.5]
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
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 32,
    overflow: 'hidden',
  },
  loaderContainer: {
    width: width * 0.5,
    height: 4,
    backgroundColor: 'rgba(128,128,128,0.15)',
    borderRadius: 2,
    marginTop: 36,
    overflow: 'hidden',
  },
  loader: {
    height: '100%',
    borderRadius: 2,
  },
});

export default FullLoadingScreen;
