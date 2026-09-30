import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { darkMapStyle, lightMapStyle } from '../constants/MapStyles';

const AppMap = forwardRef(({ showsUserLocation, darkMode, ...props }, ref) => {
  return (
    <MapView
      ref={ref}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      showsUserLocation={showsUserLocation}
      customMapStyle={darkMode ? darkMapStyle : lightMapStyle}
      showsCompass={false}
      showsTraffic={false}
      showsBuildings={false}
      showsPointsOfInterest={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      {...props}
    />
  );
});

export default AppMap;
