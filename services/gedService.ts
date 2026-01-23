import API_CONFIG from "@/app/config/api";
import api from "./api";

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
    uri: string | File; // Can be a string (React Native) or File object (Web)
    type: string;
    name: string;
  };
};

export interface Ged {
  level: undefined;
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
  assigned?: string;
  created_at: string;
  value?: string;
}

export async function createGed(
  token: string,
  input: CreateGedInput,
): Promise<{ message: string; data: Ged }> {
  const formData = new FormData();

  // Append text fields
  formData.append("idsource", input.idsource);
  formData.append("title", input.title);
  formData.append("kind", input.kind);
  formData.append("author", input.author);

  if (input.description) {
    formData.append("description", input.description);
  }

  if (input.latitude) {
    formData.append("latitude", input.latitude);
  }

  if (input.longitude) {
    formData.append("longitude", input.longitude);
  }

  if (input.level !== undefined) {
    formData.append("level", input.level.toString());
  }

  if (input.type) {
    formData.append("type", input.type);
  }

  if (input.categorie) {
    formData.append("categorie", input.categorie);
  }

  if (input.assigned) {
    formData.append("assigned", input.assigned);
  }

  // Append file if provided
  if (input.file) {
    // Check if this is a browser File object (for web uploads)
    if (typeof input.file.uri === "object" && input.file.uri instanceof File) {
      // Web: Append the actual File object
      formData.append("file", input.file.uri);
    } else {
      // React Native: Append as object with uri, type, name
      formData.append("file", {
        uri: input.file.uri,
        type: input.file.type,
        name: input.file.name,
      } as any);
    }
  }

  const res = await fetch(`${API_CONFIG.BASE_URL}/api/geds/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type header - let the browser set it with boundary for FormData
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to create GED");
  }
  return data;
}

export async function describeImage(
  token: string,
  file: { uri: string; type: string; name: string },
): Promise<string> {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  const res = await fetch(`${API_CONFIG.BASE_URL}/api/geds/describe-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type header - let the browser set it with boundary for FormData
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to describe image");
  }
  return data.description || "";
}

export async function transcribeAudio(
  token: string,
  file: { uri: string; type: string; name: string },
): Promise<string> {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  const res = await fetch(`${API_CONFIG.BASE_URL}/api/geds/transcribe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type header - let the browser set it with boundary for FormData
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to transcribe audio");
  }
  return data.text || "";
}

export async function enhanceText(
  text: string,
  token: string,
): Promise<{ enhancedText: string }> {
  const response = await api.post(
    "api/geds/enhance-text",
    { text },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
}

export async function getGedById(token: string, gedId: string): Promise<Ged> {
  try {
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await api.get(`/api/geds/${gedId}?t=${timestamp}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch GED with id ${gedId}:`, error);
    throw error;
  }
}

export const updateGed = async (
  token: string,
  gedId: string,
  data: Partial<Ged>,
): Promise<Ged> => {
  try {
    const response = await api.put(`/api/geds/${gedId}`, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  } catch (error) {
    console.error("Failed to update GED:", error);
    throw error;
  }
};

export async function updateGedFile(
  token: string,
  gedId: string,
  file: { uri: string; name: string; type: string },
  data?: Partial<Ged>,
): Promise<Ged> {
  const formData = new FormData();

  // Append file
  formData.append("file", {
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
        "Content-Type": "multipart/form-data",
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
  sortOrder: "asc" | "desc" = "desc",
): Promise<Ged[]> {
  const source = Array.isArray(idsource) ? idsource.join(",") : idsource;
  const response = await api.get(
    `/api/geds/filter?idsource=${source}&kind=${kind}&sort=${sortOrder}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.data;
}

export async function getAllGeds(token: string): Promise<Ged[]> {
  const response = await api.get("/api/geds", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function getGedsByIds(
  token: string,
  ids: string[],
): Promise<Ged[]> {
  const response = await api.post(
    "/api/geds/batch",
    { ids },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return response.data;
}

export async function generateFolderReport(
  token: string,
  folderId: string,
): Promise<{ message: string; data: Ged }> {
  const response = await api.get(`/api/gedparallele/generate-pdf/${folderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

export async function getAssignedPhotoAvant(token: string): Promise<Ged[]> {
  const response = await api.get("/api/geds/assigned/photoavant", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}

/**
 * Assign a gallery photo to a folder by updating its idsource and kind
 * @param token - Auth token
 * @param gedId - ID of the photo (GED record) to assign
 * @param folderId - ID of the folder to assign to
 * @param photoType - Type of photo ('photoavant' or 'photoapres')
 * @returns Updated GED record
 */
export async function assignPhotoToFolder(
  token: string,
  gedId: string,
  folderId: string,
  photoType: "photoavant" | "photoapres" = "photoavant",
): Promise<Ged> {
  return updateGed(token, gedId, {
    idsource: folderId,
    kind: photoType,
  });
}

/**
 * Check if a folder already has a photoAvant assigned
 * @param token - Auth token
 * @param folderId - ID of the folder to check
 * @returns Boolean indicating if folder has photoAvant
 */
export async function checkFolderHasPhotoAvant(
  token: string,
  folderId: string,
): Promise<boolean> {
  try {
    const response = await api.get(`/api/geds/check-photoavant/${folderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.hasPhotoAvant;
  } catch (error) {
    console.error("Failed to check folder photoAvant status:", error);
    return false; // Fail-safe: allow both options if check fails
  }
}

/**
 * Get all photoAvant for a specific folder
 * @param token - Auth token
 * @param folderId - ID of the folder
 * @returns Array of photoAvant GED records
 */
export async function getPhotoAvantByFolder(
  token: string,
  folderId: string,
): Promise<Ged[]> {
  try {
    const response = await api.get(
      `/api/geds/photoavant-by-folder/${folderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch photoAvant for folder:", error);
    return [];
  }
}

/**
 * Get all photos with GPS coordinates for map view
 * @param token - Auth token
 * @returns Array of GED records with latitude and longitude
 */
export async function getMapData(token: string): Promise<Ged[]> {
  try {
    const response = await api.get("/api/geds/map-data", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch map data:", error);
    return [];
  }
}

/**
 * Get all associated photos (photoAvant and photoApres) for a specific folder
 * @param token - Auth token
 * @param folderId - ID of the folder
 * @returns Array of associated GED records (photoAvant and photoApres)
 */
export async function getAssociatedPhotosByFolder(
  token: string,
  folderId: string,
): Promise<Ged[]> {
  try {
    const response = await api.get(`/api/geds/associated-photos/${folderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch associated photos for folder:", error);
    return [];
  }
}

/**
 * Get all PDF reports for the current user's company
 * @param token - Auth token
 * @returns Array of PDF report GED records with folder, project, and zone information
 */
export async function getPdfReports(token: string): Promise<Ged[]> {
  try {
    const response = await api.get("/api/geds/pdf-reports", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch PDF reports:", error);
    return [];
  }
}

/**
 * Get all company images (qualiphoto, photoavant, photoapres)
 * @param token - Auth token
 * @returns Array of GED records
 */
export async function getCompanyImages(token: string): Promise<Ged[]> {
  try {
    const response = await api.get("/api/geds/filter/company-images", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch company images:", error);
    return [];
  }
}

/**
 * Download selected images as a ZIP archive
 * @param token - Auth token
 * @param ids - Array of image IDs to download (max 10)
 */
export async function downloadImagesZip(
  token: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  if (ids.length > 10) throw new Error("Maximum 10 images allowed");

  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/geds/action/download-zip`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Download failed");
    }

    // Handle Blob download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "images.zip"; // Default filename
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Failed to download ZIP:", error);
    throw error;
  }
}
