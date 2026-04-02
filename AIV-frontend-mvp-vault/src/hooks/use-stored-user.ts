"use client";
import { useState, useEffect } from "react";

interface StoredUser {
  name?: string;
  email?: string;
  role?: string;
  organization_name?: string;
  avatar_url?: string;
  avatar?: string;
  org_name?: string;
  organization?: { name?: string };
  data?: Record<string, unknown>;
}

export function useStoredUser() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        const u = parsed.data || parsed;
        if (!u.avatar) u.avatar = "";
        setUser(u);
      }
    } catch {
      // malformed JSON
    }
    setIsLoading(false);
  }, []);

  return { user, isLoading };
}
