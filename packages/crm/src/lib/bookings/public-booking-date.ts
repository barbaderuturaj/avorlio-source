const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dateOnlyFromLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateFromDateOnly(value: string): Date {
  const match = DATE_ONLY.exec(value);
  if (!match) {
    const fallback = new Date();
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
}

export function addDaysToDateOnly(value: string, days: number): string {
  const date = localDateFromDateOnly(value);
  date.setDate(date.getDate() + days);
  return dateOnlyFromLocalDate(date);
}

export function formatDateOnlyHeading(value: string): string {
  const match = DATE_ONLY.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const noonUtc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0));
  return noonUtc.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
