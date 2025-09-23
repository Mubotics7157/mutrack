export function computeMeetingTimezoneOffsetMs(dateMs: number): number {
  const date = new Date(dateMs);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return dateMs - Date.UTC(year, month, day);
}

export function computeMeetingStartUtcMs(
  dateMs: number,
  startTime: string
): number {
  const [hoursPart, minutesPart] = startTime.split(":");
  const hours = Number.parseInt(hoursPart ?? "", 10);
  const minutes = Number.parseInt(minutesPart ?? "", 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    throw new Error(`Invalid startTime format: ${startTime}`);
  }

  const date = new Date(dateMs);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const timezoneOffsetMs = computeMeetingTimezoneOffsetMs(dateMs);

  return Date.UTC(year, month, day, hours, minutes) + timezoneOffsetMs;
}
