import api from './api';

export type FolderType = {
  id: string;
  title: string;
  description?: string | null;
  status_id: string;
  status?: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
};

export async function getAllFolderTypes(token: string): Promise<FolderType[]> {
  const response = await api.get('/api/foldertypes', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export async function createFolderType(
  data: { title: string; description?: string },
  token: string
): Promise<FolderType> {
  const response = await api.post('/api/foldertypes', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
}

export async function updateFolderType(
  id: string,
  data: { title?: string; description?: string },
  token: string
): Promise<FolderType> {
  const response = await api.put(`/api/foldertypes/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
}

export async function deleteFolderType(id: string, token: string): Promise<void> {
  await api.delete(`/api/foldertypes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
