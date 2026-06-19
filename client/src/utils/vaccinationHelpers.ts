import type { Vaccination } from "../types/intake";

export function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US');
}

export function getLatestVaccination(vaccinations: Vaccination[] = []) {
  if (!Array.isArray(vaccinations)) return undefined;
  return vaccinations[0];
}

export function buildVaccinationUpdate(
  existing: Vaccination,
  field: keyof Vaccination,
  value: any
): Vaccination {
  return {
    ...existing,
    [field]: value
  };
}

