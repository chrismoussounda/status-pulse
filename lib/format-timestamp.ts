// UTC explicitly, rather than the server's local time or the viewer's —
// unambiguous either way, and server components have no client-side
// re-render to worry about disagreeing with it.
export function formatTimestamp(date: Date, locale: string): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}
