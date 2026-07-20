/* -------------------------
   OWNER
-------------------------- */

export interface Owner {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zip_code: string;
}

export type OwnerDraft = Omit<Owner, 'id'> & {
  id?: string;
};

/* -------------------------
   ANIMAL
-------------------------- */

export type Animal = {
  id: string;
  name: string;

  species: '' | 'dog' | 'cat';
  sex: '' | 'male' | 'female';

  altered_status: boolean | null;

  primary_breed: string | null;
  secondary_breed: string | null;

  age_years: number | null;
  age_months: number | null;

  primary_color: string | null;
  secondary_color: string | null;

  pattern: string | null;

  rabies_tag_number: string | null;
  microchip_number: string | null;

  vaccinations?: Vaccination[];
};

export type AnimalDraft = Omit<Animal, 'id'> & {
  id?: string;
};

/* -------------------------
   CLINIC OFFERINGS (DB JSONB)
-------------------------- */

export type VaccineDefault = {
  enabled: boolean;
  default_product?: string;
  default_manufacturer?: string;
  default_lot_number?: string;
  default_product_expiration_date?: string;
};

export type ClinicOfferings = {
  rabies_1_year?: VaccineDefault;
  rabies_3_year?: VaccineDefault;
  microchip?: {
    enabled: boolean;
  };
};

/* -------------------------
   CLINIC
-------------------------- */

export type Clinic = {
  id: string;
  name: string;

  location_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;

  clinic_date: string;
  start_time: string;
  end_time: string | null;

  offerings?: ClinicOfferings;

  default_veterinarian?: string | null;
  notes?: string | null;

  // ADD THESE
  registered_owners?: number;
  registered_animals?: number;
};

/* -------------------------
   VACCINATION TYPES
-------------------------- */

export type VaccineType = '' | 'rabies_1_year' | 'rabies_3_year';

export type Vaccination = {
  id: string;
  animal_id: string;

  vaccine_type: VaccineType;

  product: string;
  manufacturer: string;
  rabies_tag_number: string | null;
  lot_number: string | null;
  product_expiration_date: string | null;

  notes: string | null;

  vaccinated_by: string | null;
  supervising_veterinarian: string | null;

  date_time_administered: string;
  date_time_due: string | null;

  created_at?: string;
};

export type VaccinationDraft = {
  animal_id: string;

  vaccine_type: VaccineType;

  product: string;
  manufacturer: string;

  rabies_tag_number: string | null;
  lot_number: string | null;
  product_expiration_date: string | null;

  notes: string | null;

  vaccinated_by: string | null;
  supervising_veterinarian: string | null;

  date_time_administered: string;
  date_time_due: string | null;
};