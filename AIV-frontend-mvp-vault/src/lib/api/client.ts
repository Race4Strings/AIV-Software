import axios from "axios";

// Use local rewrite proxy (/api/backend/*) to avoid CORS preflight issues.
// Next.js rewrites forward the request server-side to the Railway backend.
const apiClient = axios.create({
    baseURL: "/api/backend",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login if unauthorized
            if (typeof window !== "undefined") {
                window.location.href = "/auth/signin";
            }
        }
        return Promise.reject(error);
    }
);

export { apiClient };
export default apiClient;
