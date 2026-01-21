export interface CompanyUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone1?: string;
  phone2?: string;
  email_second?: string;
  identifier: string;
  role_id: string;
  status_id: string;
  photo?: string;
  company_id: string;
  interne?: number; // 0 = external, 1 = internal
  represent?: string; // Company represented (for external users)
  // Optional relations that might be included
  role?: { id: string; role: string }; // Field is 'role' not 'name'
  status?: { id: string; status: string }; // Field is 'status' not 'name'
}

export interface CreateUserData {
  firstname: string;
  lastname: string;
  email: string;
  identifier: string;
  password?: string;
  phone1?: string;
  phone2?: string;
  email_second?: string;
  role_id: string;
  status_id: string;
  company_id: string;
  interne?: number; // 0 = external, 1 = internal
  represent?: string; // Company represented (for external users)
}

export interface CreateUserResponse {
  message: string;
  user: CompanyUser;
  password?: string;
}

export interface UpdateUserData {
  firstname?: string;
  lastname?: string;
  email?: string;
  identifier?: string;
  password?: string;
  phone1?: string;
  phone2?: string;
  email_second?: string;
  role_id?: string;
  status_id?: string;
  interne?: number; // 0 = external, 1 = internal
  represent?: string; // Company represented (for external users)
}
