const DAY = 24 * 60 * 60 * 1000;

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export const percent = (x: number) => `${Math.round(x * 100)}%`;

export function duration(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function dayLabel(t: number, now = Date.now()) {
  const startOf = (x: number) => new Date(x).setHours(0, 0, 0, 0);
  const days = Math.round((startOf(now) - startOf(t)) / DAY);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  const sameYear = new Date(t).getFullYear() === new Date(now).getFullYear();
  return new Date(t).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  });
}

export const timeLabel = (t: number) =>
  new Date(t).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
