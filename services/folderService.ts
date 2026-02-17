import api from "./api";

export interface Ged {
  id: string;
  idsource: string;
  title: string;
  kind: string;
  description?: string;
  author?: string;
  position?: number;
  latitude?: string;
  longitude?: string;
  url?: string;
  size?: number;
  status_id: string;
  company_id: string;
  level?: number;
  type?: string;
  categorie?: string;
  created_at: string;
  updated_at: string;
}

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
  foldertype_id?: string;
  status_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  urlreport1?: string;
  urlreport2?: string;
  urlreport3?: string;
}

export interface Project {
  id: string;
  title: string;
  owner_id?: string | null;
}

export interface Zone {
  id: string;
  title: string;
  project_id: string;
}

export type CreateFolderPayload = Pick<
  Folder,
  | "code"
  | "title"
  | "description"
  | "conclusion"
  | "project_id"
  | "zone_id"
  | "owner_id"
  | "control_id"
  | "technicien_id"
  | "foldertype"
  | "foldertype_id"
>;

export type UpdateFolderPayload = Partial<Folder>;

async function generateGedParallelePdf(
  folderId: string,
  token: string,
): Promise<Ged> {
  const response = await api.get(`api/gedparallele/generate-pdf/${folderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
}

async function getAllFolders(
  token: string,
  folderTypeId?: string,
): Promise<Folder[]> {
  let url = "api/folders";
  if (folderTypeId) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        folderTypeId,
      );
    url = isUuid
      ? `api/folders?foldertype_id=${folderTypeId}`
      : `api/folders?foldertype=${folderTypeId}`;
  }
  const response = await api.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function getFolderById(
  folderId: string,
  token: string,
): Promise<Folder | null> {
  try {
    const response = await api.get(`api/folders/${folderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch folder:", error);
    return null;
  }
}

async function createFolder(
  payload: CreateFolderPayload,
  token: string,
): Promise<Folder> {
  const response = await api.post("api/folders", payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
}

async function updateFolder(
  id: string,
  payload: UpdateFolderPayload,
  token: string,
): Promise<Folder> {
  const response = await api.put(`api/folders/${id}`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function enhanceText(
  text: string,
  token: string,
): Promise<{ enhancedText: string }> {
  const response = await api.post(
    "api/folders/enhance-text",
    { text },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
}

async function getAllProjects(token: string): Promise<Project[]> {
  const response = await api.get("api/projets", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function getZonesByProjectId(
  projectId: string,
  token: string,
): Promise<Zone[]> {
  const response = await api.get(`api/zones/project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function getAllZones(token: string): Promise<Zone[]> {
  const response = await api.get("api/zones", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

async function deleteFolder(folderId: string, token: string): Promise<void> {
  await api.delete(`api/folders/${folderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

const folderService = {
  getAllFolders,
  getFolderById,
  createFolder,
  updateFolder,
  enhanceText,
  getAllProjects,
  getZonesByProjectId,
  getAllZones,
  generateGedParallelePdf,
  deleteFolder,
};

export default folderService;
