export function RoleBadge({ role }: { role: string }) {
  const getBadgeClass = () => {
    switch (role) {
      case "admin":
        return "badge-rejected";
      case "lead":
        return "badge-pending";
      default:
        return "badge-ordered";
    }
  };

  return <span className={`badge ${getBadgeClass()}`}>{role}</span>;
}
