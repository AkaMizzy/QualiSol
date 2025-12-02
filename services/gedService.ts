import API_CONFIG from '@/app/config/api';
import api from './api';

export type CreateGedInput = {
  idsource: string;
  title: string;
  description?: string;
  kind: string;
  author: string;
  latitude?: string;
  longitude?: string;
  level?: number;
  type?: string;
  categorie?: string;
  assigned?: string;
  file?: {
    uri: string;
    type: string;
    name: string;
  };
};

export interface Ged {
  id: string;
  idsource: string;
  title: string;
  kind: string;
  description: string | null;
  author: string;
  position: number | null;
  latitude: string | null;
  longitude: string | null;
  url: string | null;
  size: number | null;
  status_id: string;
  company_id: string;
  type?: string;
  categorie?: string;
  created_at: string;
  value?: string;
}

export async function createGed(token: string, input: CreateGedInput): Promise<{ message: string; data: Ged }> {
  const formData = new FormData();

  // Append text fields
  formData.append('idsource', input.idsource);
  formData.append('title', input.title);
  formData.append('kind', input.kind);
  formData.append('author', input.author);
  
  if (input.description) {
    formData.append('description', input.description);
  }
  
  if (input.latitude) {
    formData.append('latitude', input.latitude);
  }
  
  if (input.longitude) {
    formData.append('longitude', input.longitude);
  }

  if (input.level !== undefined) {
    formData.append('level', input.level.toString());
  }

  if (input.type) {
    formData.append('type', input.type);
  }

  if (input.categorie) {
    formData.append('categorie', input.categorie);
  }

  if (input.assigned) {
    formData.append('assigned', input.assigned);
  }

  // Append file if provided
  if (input.file) {
    formData.append('file', {
      uri: input.file.uri,
      type: input.file.type,
      name: input.file.name,
    } as any);
  }

  const res = await fetch(`${API_CONFIG.BASE_URL}/api/geds/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type header - let the browser set it with boundary for FormData
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create GED');
  }
  return data;
}

export async function describeImage(token: string, file: { uri: string; type: string; name: string }): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  const res = await fetch(`${API_CONFIG.BASE_URL}/api/geds/describe-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type header - let the browser set it with boundary for FormData
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to describe image');
  }
  return data.description || '';
}

export async function transcribeAudio(token: string, file: { uri: string; type: string; name: string }): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  const res = await fetch(`${API_CONFIG.BASE_URL}/api/geds/transcribe`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type header - let the browser set it with boundary for FormData
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to transcribe audio');
  }
  return data.text || '';
}

export async function enhanceText(text: string, token: string): Promise<{ enhancedText: string }> {
  const response = await api.post('api/geds/enhance-text', { text }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export const updateGed = async (token: string, gedId: string, data: Partial<Ged>): Promise<Ged> => {
  try {
    const response = await api.put(`/api/geds/${gedId}`, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to update GED:', error);
    throw error;
  }
};

export async function updateGedFile(
  token: string,
  gedId: string,
  file: { uri: string; name: string; type: string },
  data?: Partial<Ged>
): Promise<Ged> {
  const formData = new FormData();

  // Append file
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  // Append other data if provided
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
  }

  try {
    const response = await api.put(`api/geds/${gedId}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  } catch (error) {
    console.error(`Failed to update GED file with id ${gedId}:`, error);
    throw error;
  }
}

export async function getGedsBySource(
  token: string,
  idsource: string | string[],
  kind: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<Ged[]> {
  const source = Array.isArray(idsource) ? idsource.join(',') : idsource;
  const response = await api.get(`/api/geds/filter?idsource=${source}&kind=${kind}&sort=${sortOrder}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function getAllGeds(token: string): Promise<Ged[]> {
  const response = await api.get('/api/geds', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function getGedsByIds(token: string, ids: string[]): Promise<Ged[]> {
  const response = await api.post('/api/geds/batch', { ids }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function generateFolderReport(token: string, folderId: string): Promise<{ message: string; data: Ged }> {
  const response = await api.get(`/api/gedparallele/generate-pdf/${folderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}


