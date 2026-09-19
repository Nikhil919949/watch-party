const ACTION_LABEL = {
  play: "play the video",
  pause: "pause the video",
  seek: "seek to a new time",
  change_video: "change the video",
};

export default function RequestPanel({ requests, onApprove, onReject }) {
  if (requests.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-marquee-500/40 bg-marquee-500/10 p-3">
      <h3 className="font-display text-sm uppercase tracking-wide text-marquee-400">Pending requests</h3>
      <ul className="flex flex-col gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-reel-900/50 px-3 py-2">
            <p className="text-sm text-reel-100">
              <span className="font-semibold">{r.requesterUsername}</span> wants to{" "}
              {ACTION_LABEL[r.action] || r.action}
              {r.action === "change_video" && r.payload?.videoUrl ? " to a new link" : ""}.
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => onApprove(r.id)}
                className="focus-ring rounded-lg bg-signal-live px-3 py-1 text-xs font-semibold text-reel-950 hover:brightness-110"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(r.id)}
                className="focus-ring rounded-lg border border-reel-600 px-3 py-1 text-xs text-reel-200 hover:bg-reel-700"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
