import { useEffect, useState } from "react";

let apiPromise = null;

// Loads https://www.youtube.com/iframe_api exactly once for the whole app and
// resolves when window.YT is ready to construct players.
function loadYouTubeApi() {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") previousCallback();
      resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });

  return apiPromise;
}

export function useYouTubeApi() {
  const [YT, setYT] = useState(window.YT && window.YT.Player ? window.YT : null);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then((ytApi) => {
      if (!cancelled) setYT(ytApi);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return YT;
}
