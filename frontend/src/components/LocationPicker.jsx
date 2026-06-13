import React from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import GoogleLocationPicker from './GoogleLocationPicker';
import LeafletLocationPicker from './LeafletLocationPicker';

const libraries = ['places'];

const LocationPicker = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Kiểm tra cấu hình có API Key hay không
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return <LeafletLocationPicker {...props} />;
  }

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
    language: 'vi',
    region: 'VN'
  });

  // Chuyển sang Bản đồ dự phòng (Leaflet) nếu sập Google Maps
  if (loadError) {
    return <LeafletLocationPicker {...props} />;
  }

  // Chờ tải Google Maps
  if (!isLoaded) {
    return null; // Có thể để null vì GoogleLocationPicker sẽ tự lo loader
  }

  return <GoogleLocationPicker {...props} />;
};

export default LocationPicker;
