/**
 * Centralized auth storage utility with cross-tab synchronization.
 *
 * Replaces scattered localStorage.getItem/setItem("user") calls
 * with a single source of truth that broadcasts changes across tabs.
 */

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  user_name: string;
  is_verified: boolean;
  role?: string;
  avatar?: string;
}

const STORAGE_KEY = "user";

export const authStorage = {
  saveUser(data: StoredUser): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Storage failure — non-critical, user will need to re-auth
    }
  },

  getUser(): StoredUser | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Handle both {data: {...}} and flat formats
      return parsed.data || parsed;
    } catch {
      return null;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  },

  /** Listen for auth changes from other tabs. */
  onAuthChange(callback: (user: StoredUser | null) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          callback(parsed.data || parsed);
        } catch {
          callback(null);
        }
      } else {
        callback(null);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};
