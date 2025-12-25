import api from './api';

export type Anomalie2 = {
  id: string;
  anomalie?: string | null;
  company_id: string;
  cpomany?: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAllAnomalies2(token: string): Promise<Anomalie2[]> {
  const response = await api.get('/api/anomalie2', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function getAnomalie2ById(id: string, token: string): Promise<Anomalie2> {
  const response = await api.get(`/api/anomalie2/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createAnomalie2(
  data: { anomalie?: string; cpomany?: string },
  token: string
): Promise<Anomalie2> {
  const response = await api.post('/api/anomalie2', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateAnomalie2(
  id: string,
  data: { anomalie?: string; cpomany?: string },
  token: string
): Promise<Anomalie2> {
  const response = await api.put(`/api/anomalie2/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function deleteAnomalie2(id: string, token: string): Promise<void> {
  await api.delete(`/api/anomalie2/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
