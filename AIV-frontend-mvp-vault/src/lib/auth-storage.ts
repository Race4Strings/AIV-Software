/**
 * Centralized auth storage utility with cross-tab synchronization.
 *
 * Only stores non-sensitive display fields (name, role).
 * Sensitive data (id, email, user_name) should come from /auth/me API calls.
 */

export interface StoredUser {
  name: string;
  role?: string;
  // Legacy fields — kept for backward compatibility during migration
  id?: string;
  email?: string;
  user_name?: string;
  is_verified?: boolean;
  avatar?: string;
  org_id?: string;
  org_name?: string;
  organization?: { name?: string };
  [key: string]: unknown;
}

const STORAGE_KEY = "user";

export const authStorage = {
  /**
   * Save user display data to localStorage.
   * Accepts full user objects from API but only persists safe fields.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveUser(data: any): void {
    try {
      const obj = data?.data || data;
      const safeData: StoredUser = {
        name: String(obj?.name || ""),
        role: obj?.role ? String(obj.role) : undefined,
        org_id: obj?.org_id ? String(obj.org_id) : undefined,
        org_name: obj?.org_name ? String(obj.org_name) : undefined,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
    } catch {
      // Storage failure — non-critical, user will need to re-auth
    }
  },

  getUser(): StoredUser | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Handle both {data: {...}} and flat formats (legacy)
      return parsed.data || parsed;
    } catch {
      return null;
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("aiv_user_role");
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
