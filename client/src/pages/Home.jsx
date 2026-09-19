import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { roomApi, extractErrorMessage } from "../services/api";
import UsernameModal from "../components/UsernameModal";

export default function Home() {
  const { user, loginAsGuest } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [modal, setModal] = useState(null); // "create" | "join" | null
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function ensureIdentity(username) {
    if (user) return { ok: true };
    return loginAsGuest(username);
  }

  async function handleCreate(username) {
    setBusy(true);
    const auth = await ensureIdentity(username);
    if (!auth?.ok) {
      setBusy(false);
      pushToast(auth?.error || "Failed to set up identity", "error");
      return;
    }

    try {
      // Create empty room directly without requiring a video URL
      const res = await roomApi.create();
      
      // Robust resolution depending on your API service response wrapper
      const createdRoom = res?.data?.room || res?.room || res;
      const targetRoomId = createdRoom?.roomId;

      if (!targetRoomId) {
        throw new Error("Could not retrieve room ID from server");
      }

      setModal(null);
      navigate(`/room/${targetRoomId}`);
    } catch (err) {
      pushToast(extractErrorMessage(err) || "Failed to create room", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(username) {
    const cleanedCode = joinCode.trim().toUpperCase();
    if (!cleanedCode) {
      pushToast("Enter a room code first", "error");
      return;
    }

    setBusy(true);
    const auth = await ensureIdentity(username);
    if (!auth?.ok) {
      setBusy(false);
      pushToast(auth?.error || "Failed to set up identity", "error");
      return;
    }

    try {
      await roomApi.join(cleanedCode);
      setModal(null);
      navigate(`/room/${cleanedCode}`);
    } catch (err) {
      pushToast(extractErrorMessage(err) || "Failed to join room", "error");
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    if (user) {
      handleCreate();
    } else {
      setModal("create");
    }
  }

  function openJoin(e) {
    e?.preventDefault();
    if (!joinCode.trim()) {
      pushToast("Enter a room code first", "error");
      return;
    }

    if (user) {
      handleJoin();
    } else {
      setModal("join");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl font-semibold tracking-tight text-reel-100">
          Watch<span className="text-marquee-500">Party</span>
        </span>
        {user && (
          <span className="text-sm text-reel-400">
            Signed in as <strong className="text-reel-200">{user.username}</strong>
          </span>
        )}
      </nav>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="rounded-full border border-reel-700 bg-reel-800/60 px-3 py-1 text-xs text-reel-400">
            Free · No install · Sync in seconds
          </span>
          <h1 className="font-display text-4xl font-semibold leading-tight text-reel-100 sm:text-5xl">
            Watch YouTube videos <span className="text-marquee-500">together</span>, in real time.
          </h1>
          <p className="max-w-xl text-reel-300">
            Create a room, share the link, and everyone's player stays in sync — play, pause, seek
            and switch videos together, no matter where you're watching from.
          </p>
        </div>

        <div className="flex w-full max-w-md flex-col gap-4">
          <button
            type="button"
            onClick={openCreate}
            disabled={busy}
            className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-marquee-500 px-6 py-3 font-semibold text-reel-950 shadow-glow transition hover:bg-marquee-400 disabled:opacity-60"
          >
            {busy && modal === null ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-reel-950 border-t-transparent" />
                <span>Creating room…</span>
              </>
            ) : (
              "Create a room"
            )}
          </button>

          <div className="flex items-center gap-2 text-xs text-reel-500">
            <div className="h-px flex-1 bg-reel-700" />
            or join an existing one
            <div className="h-px flex-1 bg-reel-700" />
          </div>

          <form onSubmit={openJoin} className="flex flex-col gap-3">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Room code, e.g. AB3XQ9"
              maxLength={6}
              disabled={busy}
              className="focus-ring w-full rounded-xl border border-reel-600 bg-reel-800 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-reel-100 placeholder:tracking-normal placeholder:text-reel-500"
            />
            <button
              type="submit"
              disabled={busy || !joinCode.trim()}
              className="focus-ring rounded-xl border border-reel-600 px-6 py-3 font-semibold text-reel-100 transition hover:bg-reel-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Join room
            </button>
          </form>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-reel-600">
        Built with React, Socket.IO, Express &amp; MongoDB.
      </footer>

      {modal === "create" && (
        <UsernameModal
          title="What should we call you?"
          confirmLabel="Create room"
          loading={busy}
          onConfirm={handleCreate}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "join" && (
        <UsernameModal
          title="What should we call you?"
          confirmLabel="Join room"
          loading={busy}
          onConfirm={handleJoin}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}