import api from './api';

export const getPricingConfig = async () => {
  const response = await api.get('/config/PRICING_CONFIG');
  return response.data;
};

export const updatePricingConfig = async (configData) => {
  const response = await api.put('/config/PRICING_CONFIG', { value: configData });
  return response.data;
};
