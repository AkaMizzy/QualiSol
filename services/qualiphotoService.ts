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
  createdAt: string;
  updatedAt: string;
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

const folderService = {
  getAllFolders,
  createFolder,
};

export default folderService;


