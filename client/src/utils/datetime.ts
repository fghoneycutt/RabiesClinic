export function formatForDateTimeLocal(
  utcDateString: string
) {
  const date = new Date(utcDateString);

  const offset = date.getTimezoneOffset();

  const localDate = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return localDate.toISOString().slice(0, 16);
}

export function toUTC(dateTimeLocal: string) {
  return new Date(dateTimeLocal).toISOString();
}