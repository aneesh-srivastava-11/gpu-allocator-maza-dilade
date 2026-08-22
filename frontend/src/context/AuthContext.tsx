"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: "student" | "incharge" | "lab_incharge" | "superuser" | "admin";
  roll_number?: string;
  managed_lab_ids?: number[];
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  toggleDarkMode: () => void;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  wsMessage: any | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8010/ws/status";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [darkMode, setDarkModeState] = useState<boolean>(true);
  const [wsMessage, setWsMessage] = useState<any | null>(null);

  useEffect(() => {
    // Load auth token & user
    const savedToken = localStorage.getItem("gpu_portal_token");
    const savedUser = localStorage.getItem("gpu_portal_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("gpu_portal_token");
        localStorage.removeItem("gpu_portal_user");
      }
    }

    // Load dark mode preference
    const savedTheme = localStorage.getItem("gpu_portal_theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = savedTheme ? savedTheme === "dark" : prefersDark;
    setDarkModeState(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Realtime Live Status Connection (Supports both WebSockets and Serverless Polling/Realtime)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    const connectWS = () => {
      if (attempts >= maxAttempts) {
        console.log("[REALTIME] Falling back to serverless REST/Supabase Realtime updates.");
        return;
      }

      try {
        ws = new WebSocket(WS_BASE);
        ws.onopen = () => {
          console.log("[WS] Connected to live status stream.");
          attempts = 0;
        };
        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            setWsMessage(data);
          } catch (e) {}
        };
        ws.onclose = () => {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(connectWS, 5000);
          }
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch (e) {
        attempts = maxAttempts;
      }
    };

    connectWS();

    return () => {
      if (ws) ws.close();
    };
  }, []);


  const setDarkMode = (val: boolean) => {
    setDarkModeState(val);
    localStorage.setItem("gpu_portal_theme", val ? "dark" : "light");
    if (val) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const login = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("gpu_portal_token", newToken);
    localStorage.setItem("gpu_portal_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("gpu_portal_token");
    localStorage.removeItem("gpu_portal_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        darkMode,
        setDarkMode,
        toggleDarkMode,
        login,
        logout,
        wsMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
