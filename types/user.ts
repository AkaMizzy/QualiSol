export interface CompanyUser {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone1?: string;
  phone2?: string;
  email_second?: string;
  role: 'user' | 'admin';
  status: 0 | 1; 
  photo?: string;
  company_id: string;
  company_name?: string;
}

export interface CreateUserData {
  firstname: string;
  lastname: string;
  email: string;
  phone1?: string;
  phone2?: string;
  email_second?: string;
  role?: 'user' | 'admin';
  status?: 0 | 1; 
}

export interface CreateUserResponse {
  message: string;
  user: CompanyUser;
  password: string;
}

export interface UpdateUserData {
  firstname?: string;
  lastname?: string;
  email?: string;
  phone1?: string;
  phone2?: string;
  email_second?: string;
  role?: 'user' | 'admin';
  status?: 0 | 1; // 0 = inactive, 1 = active
}
