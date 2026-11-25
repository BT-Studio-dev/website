/** Server initials pill ("Design Guild" → "DG"), used when no icon is set. */
export function initialsFor(name: string): string {
  const words = name
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase());
  if (words.length === 0) return "??";
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.slice(0, 3).join("");
}

/** Group DMs without an explicit name use the member list, like Discord. */
export function defaultGroupName(
  members: { id: string; display_name?: string | null; username: string }[],
  viewerId: string,
): string {
  const others = members
    .filter((m) => m.id !== viewerId)
    .map((m) => m.display_name || m.username);
  if (others.length === 0) return "Group Message";
  if (others.length <= 3) return others.join(", ");
  return `${others.slice(0, 3).join(", ")} +${others.length - 3}`;
}
