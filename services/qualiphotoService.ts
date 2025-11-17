import api from './api';

export interface Folder {
  id: string;
  code: string;
  title: string;
  description?: string;
  conclusion?: string;
  project_id?: string;
  zone_id?: string;
  owner_id?: string;
  control_id?: string;
  technicien_id?: string;
  foldertype?: string;
  status_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  title: string;
}

export interface Zone {
  id: string;
  title: string;
  project_id: string;
}

export type CreateFolderPayload = Pick<
  Folder,
  | 'code'
  | 'title'
  | 'description'
  | 'conclusion'
  | 'project_id'
  | 'zone_id'
  | 'owner_id'
  | 'control_id'
  | 'technicien_id'
  | 'foldertype'
>;

async function getAllFolders(token: string): Promise<Folder[]> {
  const response = await api.get('api/folders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function createFolder(payload: CreateFolderPayload, token: string): Promise<Folder> {
  const response = await api.post('api/folders', payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function getAllProjects(token: string): Promise<Project[]> {
  const response = await api.get('api/projets', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function getZonesByProjectId(projectId: string, token: string): Promise<Zone[]> {
  const response = await api.get(`api/zones/project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function getAllZones(token: string): Promise<Zone[]> {
  const response = await api.get('api/zones', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}


const folderService = {
  getAllFolders,
  createFolder,
  getAllProjects,
  getZonesByProjectId,
  getAllZones,
};




export default folderService;


