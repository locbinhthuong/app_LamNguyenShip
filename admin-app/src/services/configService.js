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

export const getAppVersionConfig = async () => {
  const response = await api.get('/api/config/APP_VERSION_CONFIG');
  return response.data;
};

export const updateAppVersionConfig = async (configData) => {
  const response = await api.put('/api/config/APP_VERSION_CONFIG', { value: configData });
  return response.data;
};

export const getLateNightConfig = async () => {
  const response = await api.get('/api/config/LATE_NIGHT_SURCHARGE_CONFIG');
  return response.data;
};

export const updateLateNightConfig = async (configData) => {
  const response = await api.put('/api/config/LATE_NIGHT_SURCHARGE_CONFIG', { value: configData });
  return response.data;
};
