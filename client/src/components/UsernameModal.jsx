import { useState } from "react";

export default function UsernameModal({ title, confirmLabel, onConfirm, onClose, loading }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters");
      return;
    }
    setError("");
    onConfirm(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-reel-700 bg-reel-800 p-6 shadow-glow">
        <h2 className="font-display text-lg font-semibold text-reel-100">{title}</h2>
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your display name"
            maxLength={24}
            className="focus-ring rounded-lg border border-reel-600 bg-reel-900 px-3 py-2 text-sm text-reel-100 placeholder:text-reel-500"
          />
          {error && <p className="text-xs text-signal-danger">{error}</p>}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring flex-1 rounded-lg border border-reel-600 px-3 py-2 text-sm text-reel-200 hover:bg-reel-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="focus-ring flex-1 rounded-lg bg-marquee-500 px-3 py-2 text-sm font-semibold text-reel-950 hover:bg-marquee-400 disabled:opacity-60"
            >
              {loading ? "…" : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
