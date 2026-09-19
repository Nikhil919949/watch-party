// src/components/YouTubePlayer.jsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useYouTubeApi } from "../hooks/useYouTubeApi";

export function extractYouTubeVideoId(value) {
  if (!value || typeof value !== "string") return null;
  const input = value.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (
      url.hostname === "youtube.com" ||
      url.hostname === "www.youtube.com" ||
      url.hostname === "m.youtube.com" ||
      url.hostname === "music.youtube.com"
    ) {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
      if (
        url.pathname.startsWith("/embed/") ||
        url.pathname.startsWith("/shorts/") ||
        url.pathname.startsWith("/live/")
      ) {
        const id = url.pathname.split("/")[2]?.split("?")[0];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

const YouTubePlayer = forwardRef(function YouTubePlayer(
  {
    videoId,
    playbackState = "paused",
    currentTimeProp = 0,
    onLocalPlay,
    onLocalPause,
    onLocalSeek,
  },
  ref
) {
  const YT = useYouTubeApi();

  const containerRef = useRef(null);
  const wrapperRef = useRef(null);
  const playerRef = useRef(null);
  const readyRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(playbackState === "playing");
  const [currentTime, setCurrentTime] = useState(currentTimeProp);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const hideTimeoutRef = useRef(null);
  const ignoreEventsCount = useRef(0);
  const lastLoadedVideoId = useRef(null);

  const normalizedVideoId = extractYouTubeVideoId(videoId);

  const triggerControlsVisibility = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useImperativeHandle(ref, () => ({
    pauseVideo() {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      try {
        p.pauseVideo();
        setIsPlaying(false);
      } catch (err) {
        console.error("pauseVideo err:", err);
      }
    },

    playVideo() {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;
      try {
        p.playVideo();
        setIsPlaying(true);
      } catch (err) {
        console.error("playVideo err:", err);
      }
    },

    applyRemotePlay(targetTime) {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;

      ignoreEventsCount.current += 1;
      if (typeof targetTime === "number") {
        const local = p.getCurrentTime?.() ?? 0;
        if (Math.abs(local - targetTime) > 1.2) {
          p.seekTo(targetTime, true);
          setCurrentTime(targetTime);
        }
      }
      p.playVideo();
      setIsPlaying(true);
    },

    applyRemotePause(targetTime) {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;

      ignoreEventsCount.current += 1;
      if (typeof targetTime === "number") {
        const local = p.getCurrentTime?.() ?? 0;
        if (Math.abs(local - targetTime) > 1.2) {
          p.seekTo(targetTime, true);
          setCurrentTime(targetTime);
        }
      }
      p.pauseVideo();
      setIsPlaying(false);
    },

    applyRemoteSeek(targetTime) {
      const p = playerRef.current;
      if (!p || !readyRef.current || typeof targetTime !== "number") return;

      ignoreEventsCount.current += 1;
      p.seekTo(targetTime, true);
      setCurrentTime(targetTime);
    },

    applyRemoteChangeVideo(newUrlOrId) {
      const p = playerRef.current;
      if (!p || !readyRef.current) return;

      const validId = extractYouTubeVideoId(newUrlOrId);
      if (!validId) return;

      ignoreEventsCount.current += 1;
      lastLoadedVideoId.current = validId;
      p.cueVideoById({ videoId: validId, startSeconds: 0 });
      setCurrentTime(0);
      setIsPlaying(false);
    },

    getCurrentTime() {
      return playerRef.current?.getCurrentTime?.() ?? currentTime;
    },
  }));

  // Mount YouTube Iframe API
  useEffect(() => {
    if (!YT || !wrapperRef.current) return;

    const mountNode = document.createElement("div");
    mountNode.style.width = "100%";
    mountNode.style.height = "100%";
    wrapperRef.current.innerHTML = "";
    wrapperRef.current.appendChild(mountNode);

    let isMounted = true;

    playerRef.current = new YT.Player(mountNode, {
      width: "100%",
      height: "100%",
      videoId: normalizedVideoId || "",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        iv_load_policy: 3,
      },
      events: {
        onReady: () => {
          if (!isMounted) return;
          readyRef.current = true;
          lastLoadedVideoId.current = normalizedVideoId;
          const dur = playerRef.current.getDuration?.() ?? 0;
          setDuration(dur);

          // Initial sync position
          if (currentTimeProp > 0) {
            playerRef.current.seekTo(currentTimeProp, true);
          }
          if (playbackState === "playing") {
            ignoreEventsCount.current += 1;
            playerRef.current.playVideo();
            setIsPlaying(true);
          }
        },
        onStateChange: (event) => {
          if (!isMounted || !playerRef.current) return;

          const time = playerRef.current.getCurrentTime?.() ?? 0;
          setCurrentTime(time);

          if (ignoreEventsCount.current > 0) {
            ignoreEventsCount.current -= 1;
            return;
          }

          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            onLocalPlay?.(time);
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            onLocalPause?.(time);
          }
        },
      },
    });

    return () => {
      isMounted = false;
      readyRef.current = false;
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
      playerRef.current = null;
      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = "";
      }
    };
  }, [YT]);

  // Clock to update progress slider when playing
  useEffect(() => {
    const timer = setInterval(() => {
      if (readyRef.current && playerRef.current && isPlaying && !isScrubbing) {
        const t = playerRef.current.getCurrentTime?.() ?? 0;
        const d = playerRef.current.getDuration?.() ?? 0;
        setCurrentTime(t);
        if (d > 0 && d !== duration) setDuration(d);
      }
    }, 400);

    return () => clearInterval(timer);
  }, [isPlaying, isScrubbing, duration]);

  // Video ID changes
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current || !normalizedVideoId) return;

    if (lastLoadedVideoId.current === normalizedVideoId) return;

    lastLoadedVideoId.current = normalizedVideoId;
    ignoreEventsCount.current += 1;
    player.cueVideoById({ videoId: normalizedVideoId, startSeconds: 0 });
    setCurrentTime(0);
    setIsPlaying(false);
  }, [normalizedVideoId]);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Controls Handlers
  const togglePlay = (e) => {
    e?.stopPropagation();
    triggerControlsVisibility();
    if (!playerRef.current || !readyRef.current) return;

    const time = playerRef.current.getCurrentTime?.() ?? currentTime;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
      onLocalPause?.(time);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
      onLocalPlay?.(time);
    }
  };

  // Scrubber dragging
  const handleScrubberChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleScrubberMouseDown = () => {
    setIsScrubbing(true);
  };

  const handleScrubberMouseUp = (e) => {
    setIsScrubbing(false);
    const targetTime = parseFloat(e.target.value);
    if (playerRef.current && readyRef.current) {
      playerRef.current.seekTo(targetTime, true);
    }
    onLocalSeek?.(targetTime);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!playerRef.current || !readyRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (!playerRef.current || !readyRef.current) return;
    playerRef.current.setVolume(val);
    if (val === 0) {
      playerRef.current.mute();
      setIsMuted(true);
    } else if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    }
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => {
        console.error("Fullscreen error:", err);
      });
    } else {
      document.exitFullscreen?.();
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={triggerControlsVisibility}
      onTouchStart={triggerControlsVisibility}
      className={`group relative aspect-video w-full overflow-hidden bg-black select-none ${
        isFullscreen
          ? "h-screen w-screen rounded-none"
          : "rounded-2xl shadow-2xl ring-1 ring-reel-700"
      }`}
    >
      {/* Smart Ambient Glow Backdrop */}
      {normalizedVideoId && (
        <div
          className="pointer-events-none absolute -inset-6 z-0 opacity-40 blur-3xl transition-opacity duration-1000"
          style={{
            backgroundImage: `url(https://img.youtube.com/vi/${normalizedVideoId}/hqdefault.jpg)`,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />
      )}

      {/* Main Video Mount Container */}
      <div ref={wrapperRef} className="relative z-10 h-full w-full pointer-events-none" />

      {/* Video Tap Surface */}
      <div onClick={togglePlay} className="absolute inset-0 z-20 cursor-pointer" />

      {/* Custom Control Overlay */}
      <div
        className={`absolute inset-0 z-30 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/40 p-4 transition-opacity duration-300 ${
          showControls || !isPlaying
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 backdrop-blur-md">
            <span
              className={`h-2 w-2 rounded-full ${
                isPlaying ? "animate-pulse bg-marquee-500" : "bg-reel-500"
              }`}
            />
            <span className="text-xs font-semibold tracking-wide text-reel-200 uppercase">
              {isPlaying ? "Sync Live" : "Paused"}
            </span>
          </div>
        </div>

        {/* Center Quick Pause/Play Indicator */}
        <div
          onClick={togglePlay}
          className="self-center rounded-full bg-black/50 p-4 backdrop-blur-md transition hover:scale-110 active:scale-95 cursor-pointer"
        >
          {isPlaying ? (
            <span className="text-3xl text-reel-100">⏸</span>
          ) : (
            <span className="text-3xl text-marquee-500">▶</span>
          )}
        </div>

        {/* Bottom Bar: Timeline Scrubber + Buttons */}
        <div className="flex flex-col gap-2 bg-black/40 p-2.5 rounded-xl backdrop-blur-md">
          {/* Seek Progress Bar */}
          <div className="relative flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={currentTime}
              onChange={handleScrubberChange}
              onMouseDown={handleScrubberMouseDown}
              onTouchStart={handleScrubberMouseDown}
              onMouseUp={handleScrubberMouseUp}
              onTouchEnd={handleScrubberMouseUp}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-reel-700/70 accent-marquee-500 transition hover:h-2.5 focus:outline-none"
              style={{
                background: `linear-gradient(to right, #ec5b13 ${progressPercent}%, rgba(55, 65, 81, 0.7) ${progressPercent}%)`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-reel-200">
            {/* Play, Volume, and Time */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-lg p-1.5 hover:bg-white/10 text-lg transition"
              >
                {isPlaying ? "⏸" : "▶"}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 hover:bg-white/10 text-sm transition"
                >
                  {isMuted || volume === 0 ? "🔇" : "🔊"}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="h-1 w-16 cursor-pointer appearance-none rounded-lg bg-reel-600 accent-marquee-500"
                />
              </div>

              <span className="font-mono text-xs text-reel-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Fullscreen Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-lg p-1.5 text-base transition hover:bg-white/10 active:scale-95"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? "🗗" : "⛶"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State Overlay */}
      {!normalizedVideoId && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-reel-900/95 text-reel-400">
          <span className="font-display text-lg text-reel-200">
            No video loaded yet
          </span>
          <span className="text-sm">
            Paste a YouTube link below to watch together
          </span>
        </div>
      )}
    </div>
  );
});

export default YouTubePlayer;