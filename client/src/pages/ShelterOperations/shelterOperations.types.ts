export interface ShelterAnimal {
  id: string;
  owner_id?: string | null;
  name?: string | null;
  species?: string | null;
  primary_breed?: string | null;
  secondary_breed?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  sex?: string | null;
  age_years?: number | null;
  age_months?: number | null;
  created_at?: string | null;
  intake_date?: string | null;
  location?: string | null;
  status?: string | null;
  custody_status?: string | null;
  is_in_custody?: boolean | null;
  [key: string]: any;
}

export interface ShelterPerson {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  organization_name?: string | null;
  address?: string | null;
  secondary_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
}