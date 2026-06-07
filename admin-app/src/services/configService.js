import api from './api';

export const getPricingConfig = async () => {
  const response = await api.get('/api/config/PRICING_CONFIG');
  return response.data;
};

export const updatePricingConfig = async (configData) => {
  const response = await api.put('/api/config/PRICING_CONFIG', { value: configData });
  return response.data;
};

export const getRegionConfig = async () => {
  const response = await api.get('/api/config/REGION_CONFIG');
  return response.data;
};

export const updateRegionConfig = async (configData) => {
  const response = await api.put('/api/config/REGION_CONFIG', { value: configData });
  return response.data;
};
