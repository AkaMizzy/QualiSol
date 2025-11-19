import api from './api';

export interface Status {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const getAllStatuses = async (token: string): Promise<Status[]> => {
  try {
    const response = await api.get('/api/status', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch statuses:', error);
    throw error;
  }
};
