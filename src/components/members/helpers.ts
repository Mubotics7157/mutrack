export function formatDateYMD(ts: number) {
  return new Date(ts)
    .toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
    .toLowerCase();
}

export function formatAwardDate(ts: number | null) {
  if (!ts) return "never";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPoints(value: number) {
  const minimumFractionDigits = Number.isInteger(value) ? 0 : 1;
  return value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits: minimumFractionDigits,
  });
}

export function formatHours(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }
  const absValue = Math.abs(value);
  const fractionDigits = absValue >= 100 ? 0 : absValue >= 10 ? 1 : 2;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function filterMembers<
  T extends { name: string; email: string; role: string },
>(list: Array<T>, searchTerm: string, roleFilter: string): Array<T> {
  const normalizedSearch = searchTerm.toLowerCase();
  return list.filter((member) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      member.name.toLowerCase().includes(normalizedSearch) ||
      member.email.toLowerCase().includes(normalizedSearch);
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });
}
