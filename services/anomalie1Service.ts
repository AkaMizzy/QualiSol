import api from './api';

export type Anomalie1 = {
  id: string;
  anomalie?: string | null;
  company_id: string;
  cpmany?: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAllAnomalies1(token: string): Promise<Anomalie1[]> {
  const response = await api.get('/api/anomalie1', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function getAnomalie1ById(id: string, token: string): Promise<Anomalie1> {
  const response = await api.get(`/api/anomalie1/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createAnomalie1(
  data: { anomalie?: string },
  token: string
): Promise<Anomalie1> {
  const response = await api.post('/api/anomalie1', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function updateAnomalie1(
  id: string,
  data: { anomalie?: string },
  token: string
): Promise<Anomalie1> {
  const response = await api.put(`/api/anomalie1/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function deleteAnomalie1(id: string, token: string): Promise<void> {
  await api.delete(`/api/anomalie1/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
