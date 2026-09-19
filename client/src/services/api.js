import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("watchparty_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function extractErrorMessage(err) {
  return err?.response?.data?.error || err?.message || "Something went wrong";
}

export const authApi = {
  guest: (username) => api.post("/auth/guest", { username }),
  register: (payload) => api.post("/auth/register", payload),
  login: (payload) => api.post("/auth/login", payload),
  me: () => api.get("/auth/me"),
};

export const roomApi = {
  create: (videoUrl) => api.post("/rooms", videoUrl ? { videoUrl } : {}),
  get: (roomId) => api.get(`/rooms/${roomId}`),
  join: (roomId) => api.post(`/rooms/${roomId}/join`),
  participants: (roomId) => api.get(`/rooms/${roomId}/participants`),
  changeRole: (roomId, userId, role) => api.patch(`/rooms/${roomId}/participants/${userId}/role`, { role }),
  removeParticipant: (roomId, userId) => api.delete(`/rooms/${roomId}/participants/${userId}`),
  transferHost: (roomId, newHostId) => api.post(`/rooms/${roomId}/transfer-host`, { newHostId }),
  close: (roomId) => api.delete(`/rooms/${roomId}`),
};

export { extractErrorMessage };
export default api;
