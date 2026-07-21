import { getSessionBadge } from "../utils/planningQueries.js";

export default function SessionBadge({ session }) {
  const badge = getSessionBadge(session);
  if (!badge) return null;

  return (
    <span className={`session-badge session-badge-${badge.variant}`}>
      {badge.label}
    </span>
  );
}
