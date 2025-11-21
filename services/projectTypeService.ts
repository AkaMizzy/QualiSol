import { z } from 'zod';
import api from './api';

const projectTypeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status_id: z.string().nullable(),
  company_id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectType = z.infer<typeof projectTypeSchema>;

export async function getAllProjectTypes(token: string): Promise<ProjectType[]> {
  const response = await api.get('/api/projettype', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return z.array(projectTypeSchema).parse(response.data);
}

export async function createProjectType(
  data: { title: string; description?: string },
  token: string
): Promise<ProjectType> {
  const response = await api.post('/api/projettype', data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return projectTypeSchema.parse(response.data.data);
}

export async function updateProjectType(
  id: string,
  data: { title?: string; description?: string },
  token: string
): Promise<ProjectType> {
  const response = await api.put(`/api/projettype/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return projectTypeSchema.parse(response.data.data);
}

export async function deleteProjectType(id: string, token: string): Promise<void> {
  await api.delete(`/api/projettype/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
