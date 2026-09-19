import { useState } from "react";
import { extractYouTubeVideoId } from "./YouTubePlayer";

export default function ControlBar({
  canControl = false,
  playbackState = "paused",
  onPlay,
  onPause,
  onChangeVideo,
  onRequest,
}) {
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isValidUrl = Boolean(extractYouTubeVideoId(videoUrl));
  const isPlaying = playbackState === "playing";

  function submitVideo(e) {
    e.preventDefault();
    const trimmed = videoUrl.trim();
    if (!trimmed || !isValidUrl) return;

    setSubmitting(true);
    try {
      if (canControl) {
        onChangeVideo(trimmed);
      } else {
        onRequest("change_video", { videoUrl: trimmed });
      }
      setVideoUrl("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleTogglePlayPause(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-reel-700/70 bg-reel-800/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Playback Controls & Status */}
      <div className="flex flex-wrap items-center gap-2">
        {canControl ? (
          <div className="flex items-center gap-2">
            {/* Primary Smart Toggle */}
            <button
              type="button"
              onClick={handleTogglePlayPause}
              className={`focus-ring flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                isPlaying
                  ? "border border-reel-600 bg-reel-700/80 text-reel-100 hover:bg-reel-700"
                  : "bg-marquee-500 text-reel-950 hover:bg-marquee-400"
              }`}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>

            {/* Explicit State Buttons */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay?.();
              }}
              disabled={isPlaying}
              className="focus-ring hidden rounded-lg border border-reel-700 bg-reel-900/60 px-2.5 py-2 text-xs font-medium text-reel-200 transition hover:bg-reel-700 disabled:cursor-not-allowed disabled:opacity-30 md:inline-block"
              title="Force Play"
            >
              Play
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPause?.();
              }}
              disabled={!isPlaying}
              className="focus-ring hidden rounded-lg border border-reel-700 bg-reel-900/60 px-2.5 py-2 text-xs font-medium text-reel-200 transition hover:bg-reel-700 disabled:cursor-not-allowed disabled:opacity-30 md:inline-block"
              title="Force Pause"
            >
              Pause
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRequest?.("play")}
              className="focus-ring rounded-lg border border-reel-600 px-3 py-2 text-sm text-reel-300 transition hover:bg-reel-700"
            >
              Request Play
            </button>
            <button
              type="button"
              onClick={() => onRequest?.("pause")}
              className="focus-ring rounded-lg border border-reel-600 px-3 py-2 text-sm text-reel-300 transition hover:bg-reel-700"
            >
              Request Pause
            </button>
          </div>
        )}

        <span className="hidden text-xs text-reel-400 xl:inline">
          {canControl
            ? "You can control playback directly"
            : "Requests will be sent to the host/moderator"}
        </span>
      </div>

      {/* Video URL Form */}
      <form onSubmit={submitVideo} className="flex flex-1 gap-2 sm:max-w-sm">
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Paste YouTube link or video ID…"
          className="focus-ring w-full rounded-lg border border-reel-600 bg-reel-900 px-3 py-2 text-sm text-reel-100 placeholder:text-reel-500 focus:border-marquee-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!isValidUrl || submitting}
          className="focus-ring shrink-0 rounded-lg border border-reel-600 px-3 py-2 text-sm font-medium text-reel-100 transition hover:bg-reel-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting
            ? "Sending…"
            : canControl
            ? "Change Video"
            : "Request Video"}
        </button>
      </form>
    </div>
  );
}