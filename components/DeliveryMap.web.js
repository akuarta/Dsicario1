import React from 'react';
import AppMap from './AppMap';

const DeliveryMap = ({ darkMode, colors, origin, destination, routeData, isPickup }) => {
  return (
    <AppMap
      darkMode={darkMode}
      origin={origin}
      destination={destination}
      routeData={routeData}
    />
  );
};

export default DeliveryMap;
