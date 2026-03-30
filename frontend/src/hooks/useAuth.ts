"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, apiLogin, setTokens, clearToken } from "@/lib/api";
import type { User } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const u = await api<User>("/api/v1/auth/me");
      setUser(u);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setTokens(data.access_token, data.refresh_token);
    await fetchUser();
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    dateOfBirth: string
  ) => {
    await api<User>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        date_of_birth: dateOfBirth,
      }),
    });
    await login(email, password);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    router.push("/login");
  };

  return { user, loading, login, register, logout };
}
