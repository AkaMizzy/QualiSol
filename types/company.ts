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
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  pays?: string | null;
  ice_number?: string | null;
  logo?: string;
  nb_users?: number;
  nbusers?: number;
  nbfolders?: number;
  nbzones?: number;
  nbchanitiers?: number;
  status?: string;
  prompt1?: string | null;
  prompt3?: string | null;
  prompt4?: string | null;
  prompt5?: string | null;
}

