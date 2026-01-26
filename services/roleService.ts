import { Role } from "@/types/role";
import api from "./api"; // assuming api.ts exports an axios instance or similar, checking previous file views

// Checking api.ts content from previous view:
// const API_CONFIG = { BASE_URL: ... }; export default API_CONFIG;
// It seems there isn't a pre-configured axios instance exported as default from './api.ts' in 'app/config/api.ts'.
// Wait, I saw 'services/api.ts' in the file list earlier?
// Let me double check usage in 'userService.ts'.
// import api from "./api";
// So there is a 'services/api.ts'.

export async function getAllRoles(token?: string): Promise<Role[]> {
  const config = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined;
  const response = await api.get("/api/role", config);
  return response.data;
}
