import API_CONFIG from '../app/config/api';
import { CompanyUser, CreateUserData, CreateUserResponse, UpdateUserData } from '../types/user';

class UserService {
  private baseUrl = `${API_CONFIG.BASE_URL}/api/company`;

  async getCompanyUsers(token: string): Promise<CompanyUser[]> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createUser(token: string, userData: CreateUserData): Promise<CreateUserResponse> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getUserById(token: string, userId: string): Promise<CompanyUser> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async updateUser(token: string, userId: string, userData: UpdateUserData, photoUri?: string): Promise<{ message: string; user: CompanyUser }> {
    const formData = new FormData();
    
    // Add text fields to FormData
    if (userData.firstname) formData.append('firstname', userData.firstname);
    if (userData.lastname) formData.append('lastname', userData.lastname);
    if (userData.email) formData.append('email', userData.email);
    if (userData.phone1 !== undefined) formData.append('phone1', userData.phone1 || '');
    if (userData.phone2 !== undefined) formData.append('phone2', userData.phone2 || '');
    if (userData.email_second !== undefined) formData.append('email_second', userData.email_second || '');
    if (userData.role) formData.append('role', userData.role);
    if (userData.status !== undefined) formData.append('status', userData.status.toString());
    
    // Add photo if provided
    if (photoUri) {
      const photoBlob = {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any;
      formData.append('photo', photoBlob);
    }

    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteUser(token: string, userId: string): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

const userService = new UserService();
export default userService;
