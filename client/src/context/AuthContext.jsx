import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, extractErrorMessage } from "../services/api";
import { disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("watchparty_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("watchparty_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const loginAsGuest = useCallback(async (username) => {
    try {
      const res = await authApi.guest(username);
      localStorage.setItem("watchparty_token", res.data.token);
      setUser(res.data.user);
      return { ok: true, user: res.data.user };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    }
  }, []);

  const register = useCallback(async (payload) => {
    try {
      const res = await authApi.register(payload);
      localStorage.setItem("watchparty_token", res.data.token);
      setUser(res.data.user);
      return { ok: true, user: res.data.user };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    }
  }, []);

  const login = useCallback(async (payload) => {
    try {
      const res = await authApi.login(payload);
      localStorage.setItem("watchparty_token", res.data.token);
      setUser(res.data.user);
      return { ok: true, user: res.data.user };
    } catch (err) {
      return { ok: false, error: extractErrorMessage(err) };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("watchparty_token");
    disconnectSocket();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginAsGuest, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
