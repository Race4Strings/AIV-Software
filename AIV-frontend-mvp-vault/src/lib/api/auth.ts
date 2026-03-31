import { apiClient } from "./client";

export interface SignupData {
    name: string;
    username: string;
    email: string;
    password: string;
    access_code?: string;
}

export interface SigninData {
    identifier: string;
    password: string;
}

export interface VerifyEmailData {
    email: string;
    otp: string;
}

export interface ForgotPasswordData {
    email: string;
}

export interface ResetPasswordData {
    token: string;
    new_password: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    user_name: string;
    is_verified: boolean;
    created_at: string;
}

export interface AuthResponse {
    state: "success" | "error";
    message: string;
    data: User;
    dev_otp?: string;
}

export const authApi = {
    signup: async (data: SignupData): Promise<AuthResponse> => {
        const response = await apiClient.post("/auth/signup", data);
        return response.data;
    },

    signin: async (data: SigninData): Promise<AuthResponse> => {
        const response = await apiClient.post("/auth/signin", data);
        return response.data;
    },

    signout: async (): Promise<void> => {
        await apiClient.get("/auth/signout");
    },

    verifyEmail: async (data: VerifyEmailData): Promise<AuthResponse> => {
        const response = await apiClient.post("/auth/verify-email", data);
        return response.data;
    },

    resendOtp: async (data: { email: string }): Promise<{ dev_otp?: string }> => {
        const response = await apiClient.post("/auth/resend-otp", data);
        return response.data?.data || {};
    },

    forgotPassword: async (data: ForgotPasswordData): Promise<void> => {
        await apiClient.post("/auth/forgot-password", data);
    },

    resetPassword: async (data: ResetPasswordData): Promise<void> => {
        await apiClient.post("/auth/reset-password", data);
    },

    getMe: async (): Promise<User> => {
        const response = await apiClient.get("/auth/me");
        return response.data.data;
    },

    validateAccessCode: async (code: string): Promise<{ state: string; valid: boolean; message: string }> => {
        const response = await apiClient.post("/auth/validate-code", { code });
        return response.data;
    },

    changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
        await apiClient.post("/auth/change-password", {
            old_password: oldPassword,
            new_password: newPassword,
        });
    },
};

export default authApi;
