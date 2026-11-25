
import { api } from './api';

// ==========================================
// TYPES
// ==========================================

export interface CatTrapRentalSettings {
  id: number;
  organization_id: string;
  total_traps: number;
  default_rental_days: number;
  deposit_amount: number | string;
  rental_contract_enabled: boolean;
  rental_contract: string | null;
  return_contract_enabled: boolean;
  return_contract: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatTrapRenterInformation {
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  address: string;
  secondary_address?: string;
  city: string;
  county?: string;
  state: string;
  zip_code: string;
  [key: string]: unknown;
}

export type CatTrapRentalStatus =
  | 'pending_signature'
  | 'active'
  | 'returned'
  | 'cancelled';

export interface CatTrapRental {
  id: number;
  organization_id: string;
  renter_information: CatTrapRenterInformation;
  quantity: number;
  rental_date: string;
  expected_return_date: string;
  deposit_amount: number | string;
  rental_contract_snapshot: string | null;
  rental_signature_path: string | null;
  rental_signature_method: 'drawn' | 'typed' | null;
  rental_signature_text: string | null;
  return_date: string | null;
  return_contract_snapshot: string | null;
  return_signature_path: string | null;
  return_signature_method: 'drawn' | 'typed' | null;
  return_signature_text: string | null;
  deposit_returned: boolean;
  deposit_returned_at: string | null;
  status: CatTrapRentalStatus;
  notes: string | null;
  created_by: string | null;
  returned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatTrapRentalDashboard {
  settings: CatTrapRentalSettings;
  inventory: {
    total: number;
    rented: number;
    available: number;
    overdue: number;
  };
  rentalCounts: {
    active: number;
    overdue: number;
  };
  recentRentals: CatTrapRental[];
}

export interface CatTrapRentalSettingsUpdate {
  totalTraps: number;
  defaultRentalDays: number;
  depositAmount: number;
  rentalContractEnabled: boolean;
  rentalContract: string | null;
  returnContractEnabled: boolean;
  returnContract: string | null;
}

export interface CreateCatTrapRentalData {
  renterInformation: CatTrapRenterInformation;
  quantity: number;
  rentalDate?: string;
  expectedReturnDate?: string;
}

export interface ReturnCatTrapRentalData {
  returnDate?: string;
  depositReturned: boolean;
  notes?: string;
  signatureMethod?: 'drawn' | 'typed';
  signatureFile?: File | null;
  signatureText?: string;
}

// ==========================================
// SIGNING SESSION TYPES
// ==========================================

export interface SigningStation {
  id: string;
  name: string;
  is_active: boolean;
  is_paired: boolean;
  last_seen_at: string | null;
}

export interface CreateSigningSessionData {
  stationId: string;
  sessionType: string;
  sourceModule: string;
  sourceRecordType: string;
  sourceRecordId: string;
  expiresAt: string;
  documents: {
    title: string;
    documentType: string;
    contentFormat: 'html' | 'plain_text' | 'pdf';
    contentText?: string;
    storagePath?: string;
    requiresSignature: boolean;
    sortOrder?: number;
  }[];
  signers: {
    signerOrder: number;
    displayName: string;
    signerRole: string;
    email?: string;
    }[];
}

// ==========================================
// SETTINGS
// ==========================================

export const getCatTrapRentalSettings = async (): Promise<CatTrapRentalSettings> => {
  const res = await api.get('/cat-trap-rentals/settings');
  return res.data;
};

export const updateCatTrapRentalSettings = async (
  data: Partial<CatTrapRentalSettingsUpdate>
): Promise<{
  message: string;
  settings: CatTrapRentalSettings;
}> => {
  const res = await api.put('/cat-trap-rentals/settings', data);
  return res.data;
};

// ==========================================
// DASHBOARD
// ==========================================

export const getCatTrapRentalDashboard = async (): Promise<CatTrapRentalDashboard> => {
  const res = await api.get('/cat-trap-rentals/dashboard');
  return res.data;
};

// ==========================================
// RENTALS
// ==========================================

export const getCatTrapRentals = async (params?: {
  status?: 'all' | CatTrapRentalStatus;
  search?: string;
  limit?: number;
}): Promise<CatTrapRental[]> => {
  const res = await api.get('/cat-trap-rentals/rentals', {
    params
  });

  return res.data;
};

export const getCatTrapRental = async (
  id: number
): Promise<CatTrapRental> => {
  const res = await api.get(`/cat-trap-rentals/rentals/${id}`);
  return res.data;
};

// ==========================================
// CREATE RENTAL
// ==========================================

export const createCatTrapRental = async (
  data: CreateCatTrapRentalData
): Promise<{
  message: string;
  rental: CatTrapRental;
}> => {
  const res = await api.post(
    '/cat-trap-rentals/rentals',
    data
  );

  return res.data;
};

// ==========================================
// SIGNING STATIONS
// ==========================================

export const getSigningStations = async (): Promise<SigningStation[]> => {
  const res = await api.get('/signing-stations');
  return res.data;
};

// ==========================================
// CREATE SIGNING SESSION
// ==========================================

export const createSigningSession = async (
  data: CreateSigningSessionData
) => {
  const res = await api.post('/signing-sessions', data);
  return res.data;
};

// ==========================================
// RETURN RENTAL
// ==========================================

// Retained temporarily. We'll replace this with the
// return-contract review and signing workflow next.

export const returnCatTrapRental = async (
  id: number,
  data: ReturnCatTrapRentalData
): Promise<{
  message: string;
  rental: CatTrapRental;
}> => {
  const formData = new FormData();

  formData.append('depositReturned', String(data.depositReturned));

  if (data.returnDate) {
    formData.append('returnDate', data.returnDate);
  }

  if (data.notes) {
    formData.append('notes', data.notes);
  }

  if (data.signatureMethod) {
    formData.append('signatureMethod', data.signatureMethod);
  }

  if (data.signatureFile) {
    formData.append('signatureFile', data.signatureFile);
  }

  if (data.signatureText) {
    formData.append('signatureText', data.signatureText);
  }

  const res = await api.post(
    `/cat-trap-rentals/rentals/${id}/return`,
    formData
  );

  return res.data;
};