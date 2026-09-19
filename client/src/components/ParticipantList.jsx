import { useState } from "react";
import RoleBadge from "./RoleBadge";

const ASSIGNABLE_ROLES = ["MODERATOR", "PARTICIPANT", "VIEWER"];

export default function ParticipantList({
  participants,
  currentUserId,
  isHost,
  hostId,
  allowParticipantControl = false,
  onUpdateSettings,
  onChangeRole,
  onRemove,
  onTransferHost,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const sorted = [...participants].sort((a, b) => {
    const order = { HOST: 0, MODERATOR: 1, PARTICIPANT: 2, VIEWER: 3 };
    return order[a.role] - order[b.role];
  });

  return (
    <div className="flex flex-col gap-2">
      {/* Header with Title and Host Settings Button */}
      <div className="flex items-center justify-between border-b border-reel-700/60 pb-2">
        <h3 className="font-display text-sm uppercase tracking-wide text-reel-400">
          Participants ({participants.length})
        </h3>
        {isHost && (
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="focus-ring flex items-center gap-1 rounded-lg border border-reel-700 bg-reel-900/60 px-2 py-1 text-xs font-medium text-reel-300 transition hover:bg-reel-700 hover:text-reel-100"
            title="Room Settings"
          >
            ⚙ Settings
          </button>
        )}
      </div>

      {/* Participants List */}
      <ul className="flex flex-col gap-1.5">
        {sorted.map((p) => {
          const isSelf = String(p.userId) === String(currentUserId);
          const canManage = isHost && String(p.userId) !== String(hostId);

          return (
            <li
              key={p.userId}
              className="group relative flex items-center justify-between rounded-xl border border-reel-700/70 bg-reel-800/60 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    p.online ? "bg-signal-live" : "bg-reel-500"
                  }`}
                  title={p.online ? "Online" : "Offline"}
                />
                <span className="truncate text-sm font-medium text-reel-100">
                  {p.username}
                  {isSelf && <span className="text-reel-400"> (you)</span>}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <RoleBadge role={p.role} />
                {canManage && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === p.userId ? null : p.userId)
                      }
                      className="focus-ring rounded-md px-1.5 py-0.5 text-reel-400 hover:bg-reel-700 hover:text-reel-100"
                      aria-label={`Manage ${p.username}`}
                    >
                      ⋯
                    </button>
                    {openMenuId === p.userId && (
                      <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-reel-600 bg-reel-800 shadow-xl">
                        <div className="border-b border-reel-700 px-3 py-1.5 text-xs uppercase tracking-wide text-reel-400">
                          Set role
                        </div>
                        {ASSIGNABLE_ROLES.map((role) => (
                          <button
                            key={role}
                            onClick={() => {
                              onChangeRole(p.userId, role);
                              setOpenMenuId(null);
                            }}
                            disabled={role === p.role}
                            className="block w-full px-3 py-1.5 text-left text-sm text-reel-200 hover:bg-reel-700 disabled:opacity-40"
                          >
                            {role.charAt(0) + role.slice(1).toLowerCase()}
                          </button>
                        ))}
                        <div className="border-t border-reel-700">
                          <button
                            onClick={() => {
                              onTransferHost(p.userId);
                              setOpenMenuId(null);
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-marquee-400 hover:bg-reel-700"
                          >
                            Make host
                          </button>
                          <button
                            onClick={() => {
                              onRemove(p.userId);
                              setOpenMenuId(null);
                            }}
                            className="block w-full px-3 py-1.5 text-left text-sm text-signal-danger hover:bg-reel-700"
                          >
                            Remove from room
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Host Room Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-reel-700 bg-reel-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-reel-700/80 pb-3">
              <h3 className="font-display text-base font-semibold text-reel-100">
                Room Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-reel-400 hover:text-reel-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm font-medium text-reel-200">
                    Allow All Participant Controls
                  </span>
                  <p className="mt-0.5 text-xs text-reel-400">
                    When enabled, everyone in the room can play, pause, seek, and change videos. When disabled, only the host and moderators have playback controls.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowParticipantControl}
                  onChange={(e) => onUpdateSettings?.(e.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer rounded border-reel-600 bg-reel-950 text-marquee-500 accent-marquee-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="rounded-lg bg-marquee-500 px-4 py-1.5 text-sm font-semibold text-reel-950 hover:bg-marquee-400"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}