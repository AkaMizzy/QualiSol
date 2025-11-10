import API_CONFIG from '@/app/config/api';

export type Zone = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  project_id: string | null;
  owner_id: string | null;
  control_id: string | null;
  technicien_id: string | null;
  zonetype_id: string | null;
  status_id: string;
  company_id: string;
};

export type ZoneType = {
  id: string;
  title: string;
  description: string | null;
  status_id: string;
  company_id: string;
  createdAt: string;
  updatedAt: string;
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
};

type CreateZoneInput = {
  code: string;
  title: string;
  description?: string;
  project_id?: string;
  owner_id?: string;
  control_id?: string;
  technicien_id?: string;
  zonetype_id?: string;
};

type UpdateZoneInput = Partial<{
  code: string;
  title: string;
  description: string;
  project_id: string | null;
  owner_id: string | null;
  control_id: string | null;
  technicien_id: string | null;
  zonetype_id: string | null;
}>;

export async function getAllZones(token: string): Promise<Zone[]> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/zones`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch zones');
  }
  return res.json();
}

export async function getZoneById(token: string, id: string): Promise<Zone> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/zones/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch zone');
  }
  return res.json();
}

export async function createZone(token: string, body: CreateZoneInput): Promise<{ message: string; data: Zone }> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/zones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create zone');
  }
  return data;
}

export async function updateZone(
  token: string,
  id: string,
  body: UpdateZoneInput
): Promise<{ message: string; data: Zone }> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/zones/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update zone');
  }
  return data;
}

export async function deleteZone(token: string, id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/zones/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete zone');
  }
  return data;
}

export async function getAllZoneTypes(token: string): Promise<ZoneType[]> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/zonetype`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch zone types');
  }
  return res.json();
}

export async function getZonePictures(token: string, zoneId: string, kind: string = 'delimitation'): Promise<Ged[]> {
  const params = new URLSearchParams({
    idsource: zoneId,
    kind: kind,
  });
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/geds/query?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch zone pictures');
  }
  return res.json();
}

