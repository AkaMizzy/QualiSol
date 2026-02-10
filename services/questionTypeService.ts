import api from "./api";

export type QuestionType = {
  id: string;
  foldertype_id: string;
  title: string;
  description?: string | null;
  type?:
    | "text"
    | "long_text"
    | "number"
    | "file"
    | "photo"
    | "video"
    | "date"
    | "boolean"
    | "GPS"
    | "list"
    | "taux"
    | "voice"
    | null;
  mask?: string | null;
  quantity?: number | null;
  price?: number | null;
  order?: number | null;
  status_id: string;
  status?: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
};

export async function getQuestionTypesByFolder(
  folderTypeId: string,
  token: string,
): Promise<QuestionType[]> {
  const response = await api.get("/api/questiotypes", {
    headers: { Authorization: `Bearer ${token}` },
    params: { foldertype_id: folderTypeId },
  });
  return response.data;
}

export type CreateQuestionTypeDto = {
  foldertype_id: string;
  title: string;
  description?: string;
  type?:
    | "text"
    | "long_text"
    | "number"
    | "file"
    | "photo"
    | "video"
    | "date"
    | "boolean"
    | "GPS"
    | "list"
    | "taux"
    | "voice";
  quantity?: number;
  price?: number;
};

export async function createQuestionType(
  data: CreateQuestionTypeDto,
  token: string,
): Promise<QuestionType> {
  const response = await api.post("/api/questiotypes", data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

export type UpdateQuestionTypeDto = {
  title?: string;
  description?: string;
  type?:
    | "text"
    | "long_text"
    | "number"
    | "file"
    | "photo"
    | "video"
    | "date"
    | "boolean"
    | "GPS"
    | "list"
    | "taux"
    | "voice";
  quantity?: number;
  price?: number;
};

export async function updateQuestionType(
  id: string,
  data: UpdateQuestionTypeDto,
  token: string,
): Promise<QuestionType> {
  const response = await api.put(`/api/questiotypes/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data.data;
}

export async function deleteQuestionType(
  id: string,
  token: string,
): Promise<void> {
  await api.delete(`/api/questiotypes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function bulkImportQuestionTypes(
  folderTypeId: string,
  file: any, // DocumentPickerResult asset
  token: string,
): Promise<any> {
  const formData = new FormData();
  formData.append("foldertype_id", folderTypeId);

  // Append file
  // React Native FormData expects { uri, name, type }
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type:
      file.mimeType ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  } as any);

  const response = await api.post("/api/questiotypes/bulk-import", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}
