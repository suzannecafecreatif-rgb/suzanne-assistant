export const MS_WEEK = 7 * 24 * 3600 * 1000;

export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function getSaisonLabel(month) {
  if ([11, 0, 1].includes(month)) return "l'hiver";
  if ([2, 3, 4].includes(month)) return "le printemps";
  if ([5, 6, 7].includes(month)) return "l'été";
  return "l'automne";
}

export function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function formatDateShort(d) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDayLabel(d) {
  return capitalize(d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" }));
}

export function formatMonthLabel(d) {
  return capitalize(d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));
}
