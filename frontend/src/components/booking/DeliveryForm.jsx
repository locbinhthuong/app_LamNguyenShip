import React from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import GoogleDeliveryForm from './GoogleDeliveryForm';
import LeafletDeliveryForm from './LeafletDeliveryForm';

const libraries = ['places'];

export default function DeliveryForm(props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Nếu không có API Key thì xài luôn bản đồ miễn phí
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return <LeafletDeliveryForm {...props} />;
  }

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
    language: 'vi',
    region: 'VN'
  });

  // Nếu quá giới hạn Quota bị Google chặn (Load Error) -> Chuyển về Leaflet
  if (loadError) {
    return <LeafletDeliveryForm {...props} />;
  }

  // Nếu đang tải thì cứ render GoogleDeliveryForm nó sẽ tự hiện Loader
  return <GoogleDeliveryForm {...props} />;
}
