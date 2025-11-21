import api from './api';

export type QuestionType = {
  id: string;
  foldertype_id: string;
  title: string;
  description?: string | null;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'file' | null;
  mask?: string | null;
  quantity?: number | null;
  price?: number | null;
  order?: number | null;
  status_id: string;
  status?: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
};

export async function getQuestionTypesByFolder(folderTypeId: string, token: string): Promise<QuestionType[]> {
  const response = await api.get('/api/questiotypes', {
    headers: { Authorization: `Bearer ${token}` },
    params: { foldertype_id: folderTypeId },
  });
  return response.data;
}

export type CreateQuestionTypeDto = {
  foldertype_id: string;
  title: string;
  description?: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'file';
  quantity?: number;
  price?: number;
};

export async function createQuestionType(
  data: CreateQuestionTypeDto,
  token: string
): Promise<QuestionType> {
  const response = await api.post('/api/questiotypes', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export type UpdateQuestionTypeDto = {
  title?: string;
  description?: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'file';
  quantity?: number;
  price?: number;
};

export async function updateQuestionType(
  id: string,
  data: UpdateQuestionTypeDto,
  token: string
): Promise<QuestionType> {
  const response = await api.put(`/api/questiotypes/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
}

export async function deleteQuestionType(id: string, token: string): Promise<void> {
  await api.delete(`/api/questiotypes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
