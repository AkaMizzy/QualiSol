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

export interface ExtractedProspectData {
  prospectcompany: string | null;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  phone1: string | null;
}

export async function scanBusinessCard(
  token: string, 
  imageBase64: string
): Promise<{ success: boolean; data: ExtractedProspectData }> {
  try {
    const response = await api.post(
      '/api/prospects/scan-business-card',
      { image: imageBase64 },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to scan business card:', error);
    throw error;
  }
}
