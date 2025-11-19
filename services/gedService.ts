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
  file?: {
    uri: string;
    type: string;
    name: string;
  };
};

export type Ged = {
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
};

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

export async function getGedsBySource(token: string, idsource: string, kind: string, sortOrder: 'asc' | 'desc' = 'desc'): Promise<Ged[]> {
  const response = await api.get(`/api/geds/filter?idsource=${idsource}&kind=${kind}&sort=${sortOrder}`, {
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


