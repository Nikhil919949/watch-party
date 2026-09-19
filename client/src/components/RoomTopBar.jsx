import { useState } from "react";
import { Link } from "react-router-dom";

export default function RoomTopBar({ roomId, onLeave }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-reel-700/70 bg-reel-900/80 px-4 py-3 backdrop-blur sm:px-6">
      <Link to="/" className="font-display text-lg font-semibold tracking-tight text-reel-100">
        Watch<span className="text-marquee-500">Party</span>
      </Link>

      <div className="flex items-center gap-2">
        <span className="rounded-lg border border-reel-600 bg-reel-800 px-3 py-1.5 font-mono text-sm tracking-widest text-marquee-400">
          {roomId}
        </span>
        <button
          onClick={copyLink}
          className="focus-ring rounded-lg border border-reel-600 px-3 py-1.5 text-sm text-reel-200 transition hover:bg-reel-700"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          onClick={onLeave}
          className="focus-ring rounded-lg border border-signal-danger/40 px-3 py-1.5 text-sm text-signal-danger transition hover:bg-signal-danger/10"
        >
          Leave room
        </button>
      </div>
    </header>
  );
}
