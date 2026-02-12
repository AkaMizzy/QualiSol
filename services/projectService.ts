import API_CONFIG from "@/app/config/api";

export type Project = {
  id: string;
  title: string;
  company_id: string;
  dd: string; // start date (YYYY-MM-DD)
  df: string; // end date (YYYY-MM-DD)
  code: string;
  description: string | null;
  status_id: string;
  owner_id: string | null;
  control_id: string | null;
  technicien_id: string | null;
  projecttype_id: string | null;
  urlreport1: string | null;
  urlreport2: string | null;
  urlreport3: string | null;
  project_type_title?: string | null; // This might need to be fetched separately
  company_title?: string | null; // Company name for display
  createdAt: string;
  updatedAt: string;
};

type CreateProjectInput = {
  code: string;
  title: string;
  description?: string;
  dd: string;
  df: string;
  owner_id?: string;
  control_id: string;
  technicien_id: string;
  projecttype_id?: string;
  urlreport1?: string;
  urlreport2?: string;
  urlreport3?: string;
};

type UpdateProjectInput = Partial<{
  code: string;
  title: string;
  description: string;
  dd: string;
  df: string;
  owner_id: string | null;
  control_id: string | null;
  technicien_id: string | null;
  projecttype_id: string | null;
  urlreport1: string | null;
  urlreport2: string | null;
  urlreport3: string | null;
}>;

export async function getAllProjects(token: string): Promise<Project[]> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/projets`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch projects");
  }
  return res.json();
}

export async function getProjectById(
  token: string,
  id: string,
): Promise<Project> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/projets/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch project");
  }
  return res.json();
}

export async function createProject(
  token: string,
  body: CreateProjectInput,
): Promise<{ message: string; data: Project }> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/projets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to create project");
  }
  return data;
}

export async function updateProject(
  token: string,
  id: string | number,
  body: UpdateProjectInput,
): Promise<{ message: string; data: Project }> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/projets/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to update project");
  }
  return data;
}

export async function deleteProject(
  token: string,
  id: string | number,
): Promise<{ message: string }> {
  const res = await fetch(`${API_CONFIG.BASE_URL}/api/projets/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to delete project");
  }
  return data;
}
