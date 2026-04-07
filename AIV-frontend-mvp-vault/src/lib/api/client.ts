import axios from "axios";
import { authStorage } from "../auth-storage";

const apiClient = axios.create({
    baseURL: "/api/backend",
    withCredentials: true,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
});

let isRedirecting = false;

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !isRedirecting) {
            if (typeof window !== "undefined") {
                isRedirecting = true;
                authStorage.clear();
                localStorage.removeItem("aiv_user_role");
                localStorage.removeItem("aiv_dashboard_seen");
                fetch("/api/backend/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
                window.location.href = "/auth/signin";
            }
        }
        return Promise.reject(error);
    }
);

export { apiClient };
export default apiClient;
