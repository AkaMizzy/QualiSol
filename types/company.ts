export interface Sector {
  id?: string;
  phone1?: string | null;
  phone2?: string | null;
  website?: string | null;
  email2?: string | null;
}

export interface Company {
  id: string;
  title: string;
  description?: string | null;
  email: string;
  foundedYear?: number | null;
  sector_id?: string;
  sector?: Sector;
  logo?: string;
  nb_users?: number;
  status?: string;
}
