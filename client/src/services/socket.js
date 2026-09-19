import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

let socket = null;

// A single shared socket connection, (re)created whenever the auth token
// changes. autoConnect is disabled so callers explicitly connect() once
// listeners are attached, avoiding a race where events are missed.
export function getSocket() {
  const token = localStorage.getItem("watchparty_token");

  if (socket && socket.__token === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    autoConnect: false,
    auth: { token },
    transports: ["websocket", "polling"],
  });
  socket.__token = token;

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
