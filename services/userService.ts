import {
    CompanyUser,
    CreateUserData,
    CreateUserResponse,
    UpdateUserData,
} from "../types/user";
import api from "./api";

export async function getUsers(): Promise<CompanyUser[]> {
  const response = await api.get("/api/users");
  return response.data;
}

export async function createUser(
  userData: CreateUserData,
): Promise<CreateUserResponse> {
  const response = await api.post("/api/users", userData);
  return response.data;
}

export async function getUserById(userId: string): Promise<CompanyUser> {
  const response = await api.get(`/api/users/${userId}`);
  return response.data;
}

export async function updateUser(
  userId: string,
  userData: UpdateUserData,
  photoUri?: string,
): Promise<{ message: string; user: CompanyUser }> {
  // If there's a photo, use FormData; otherwise, use JSON
  if (photoUri) {
    const formData = new FormData();

    // Add text fields to FormData
    if (userData.firstname) formData.append("firstname", userData.firstname);
    if (userData.lastname) formData.append("lastname", userData.lastname);
    if (userData.email) formData.append("email", userData.email);
    if (userData.phone1 !== undefined)
      formData.append("phone1", userData.phone1 || "");
    if (userData.phone2 !== undefined)
      formData.append("phone2", userData.phone2 || "");
    if (userData.email_second !== undefined)
      formData.append("email_second", userData.email_second || "");
    if (userData.role_id) formData.append("role_id", userData.role_id);
    if (userData.status_id) formData.append("status_id", userData.status_id);
    if (userData.identifier) formData.append("identifier", userData.identifier);

    // Add photo
    const photoBlob = {
      uri: photoUri,
      type: "image/jpeg",
      name: "photo.jpg",
    } as any;
    formData.append("photo", photoBlob);

    const response = await api.put(`/api/users/${userId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } else {
    // No photo, send as JSON
    const response = await api.put(`/api/users/${userId}`, userData);
    return response.data;
  }
}

export async function deleteUser(userId: string): Promise<{ message: string }> {
  const response = await api.delete(`/api/users/${userId}`);
  return response.data;
}
