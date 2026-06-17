import React from 'react';
import LeafletDeliveryForm from './LeafletDeliveryForm';

export default function DeliveryForm({ mode = 'delivery', ...props }) {
  // Always use Leaflet map to avoid Google Maps API key restriction errors on Capacitor mobile app
  return <LeafletDeliveryForm {...props} mode={mode} />;
}
