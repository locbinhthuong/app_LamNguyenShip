import React from 'react';
import LeafletLocationPicker from './LeafletLocationPicker';

const LocationPicker = (props) => {
  // Always use Leaflet map to avoid Google Maps API key restriction errors on Capacitor mobile app
  return <LeafletLocationPicker {...props} />;
};

export default LocationPicker;
