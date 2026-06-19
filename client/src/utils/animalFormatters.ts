export const formatSpecies = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';

export const formatSex = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : '-';

export const formatAge = (years: number | null, months: number | null) => {
  const parts: string[] = [];

  if (years) {
    parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  }

  if (months) {
    parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  }

  return parts.length ? parts.join(', ') : '-';
};