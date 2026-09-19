const ROLE_META = {
  HOST: { label: "Host", icon: "👑", className: "bg-marquee-500/15 text-marquee-400 border-marquee-500/30" },
  MODERATOR: { label: "Moderator", icon: "🛡", className: "bg-signal-live/15 text-signal-live border-signal-live/30" },
  PARTICIPANT: { label: "Participant", icon: "👤", className: "bg-reel-600/40 text-reel-200 border-reel-500/40" },
  VIEWER: { label: "Viewer", icon: "👁", className: "bg-reel-700/60 text-reel-400 border-reel-600/50" },
};

export default function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.VIEWER;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}
