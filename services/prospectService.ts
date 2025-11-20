import api from './api';

export interface Prospect {
  id: string;
  prospectcompany?: string;
  firstname: string;
  lastname: string;
  email: string;
  phone1?: string;
  phone2?: string;
  email_second?: string;
  status_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  rectoUrl?: string;
  versoUrl?: string;
}

export interface CreateProspectInput {
  prospectcompany?: string;
  firstname: string;
  lastname: string;
  email: string;
  phone1?: string;
  phone2?: string;
  email_second?: string;
}

export async function createProspect(token: string, prospectData: CreateProspectInput): Promise<{ message: string; data: Prospect }> {
  try {
    const response = await api.post('/api/prospects', prospectData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to create prospect:', error);
    throw error;
  }
}

export async function searchProspects(token: string, term: string): Promise<Prospect[]> {
  try {
    const response = await api.get(`/api/prospects/search?term=${term}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to search prospects:', error);
    throw error;
  }
}
