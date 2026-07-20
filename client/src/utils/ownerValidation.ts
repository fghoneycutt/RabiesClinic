import type { OwnerDraft, Owner } from '../types/intake';

type OwnerData = Owner | OwnerDraft;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /\D/g;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, '').length === 10;
}

export function isValidZipCode(zipCode: string): boolean {
  return zipCode.trim().length === 5;
}

export function formatPhoneNumber(value: string): string {
  const numbers = value.replace(PHONE_REGEX, '').slice(0, 10);

  if (numbers.length < 4) return numbers;

  if (numbers.length < 7) {
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  }

  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
}

export function isOwnerValid(owner: OwnerData): boolean {
  return (
    owner.first_name.trim() !== '' &&
    owner.last_name.trim() !== '' &&
    isValidEmail(owner.email) &&
    isValidPhone(owner.phone) &&
    owner.address.trim() !== '' &&
    owner.city.trim() !== '' &&
    owner.county.trim() !== '' &&
    owner.state.trim() !== '' &&
    isValidZipCode(owner.zip_code)
  );
}