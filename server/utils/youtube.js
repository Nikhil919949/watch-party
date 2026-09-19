// Accepts a raw YouTube URL or a bare 11-char video id and returns a valid
// video id, or null if the input cannot be parsed into one.
function extractYouTubeId(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  const bareIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  if (bareIdPattern.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return bareIdPattern.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && bareIdPattern.test(id) ? id : null;
      }
      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/")[2];
        return bareIdPattern.test(id) ? id : null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        const id = url.pathname.split("/")[2];
        return bareIdPattern.test(id) ? id : null;
      }
      if (url.pathname.startsWith("/live/")) {
        const id = url.pathname.split("/")[2];
        return bareIdPattern.test(id) ? id : null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

module.exports = { extractYouTubeId };
