import { useEffect, useRef, useState } from "react";

export default function ChatPanel({ messages = [], currentUserId, onSend }) {
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function submit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      onSend(trimmed);
      setText("");
    } finally {
      // Small timeout to prevent keyboard enter spam
      setTimeout(() => setIsSending(false), 200);
    }
  }

  // Deduplicate messages by ID to prevent repeated keys/renders
  const uniqueMessages = Array.from(
    new Map(messages.map((m) => [m.id || `${m.createdAt}-${m.userId}`, m])).values()
  );

  return (
    <div className="flex h-full flex-col rounded-2xl border border-reel-700/70 bg-reel-800/60">
      <div className="border-b border-reel-700/70 px-4 py-3">
        <h3 className="font-display text-sm uppercase tracking-wide text-reel-400">
          Chat
        </h3>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {uniqueMessages.length === 0 && (
          <p className="text-sm text-reel-500">
            No messages yet. Say hello to the room.
          </p>
        )}
        {uniqueMessages.map((m) => (
          <div
            key={m.id || `${m.userId}-${m.createdAt}`}
            className={`max-w-[85%] ${
              m.userId === currentUserId ? "ml-auto text-right" : ""
            }`}
          >
            <div className="text-xs text-reel-400">
              {m.username} ·{" "}
              {new Date(m.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div
              className={`mt-0.5 inline-block rounded-xl px-3 py-1.5 text-sm ${
                m.userId === currentUserId
                  ? "bg-marquee-500 text-reel-950"
                  : "bg-reel-700 text-reel-100"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-reel-700/70 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Type a message…"
          className="focus-ring w-full rounded-lg border border-reel-600 bg-reel-900 px-3 py-2 text-sm text-reel-100 placeholder:text-reel-500"
        />
        <button
          type="submit"
          disabled={isSending || !text.trim()}
          className="focus-ring shrink-0 rounded-lg bg-marquee-500 px-3 py-2 text-sm font-semibold text-reel-950 hover:bg-marquee-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}