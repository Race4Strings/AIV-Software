import apiClient from "./client";

export interface TrainingSubmission {
    id: string;
    twin_id: string;
    category: string;
    content: Record<string, unknown>;
    status: "pending" | "approved" | "rejected";
    target_fields: string[];
    change_description?: string;
    created_at: string;
}

export const trainingApi = {
    getSubmissions: (twinId: string) =>
        apiClient.get<TrainingSubmission[]>(`/twins/${twinId}/training`).then((r) => r.data),

    createSubmission: (twinId: string, data: Partial<TrainingSubmission>) =>
        apiClient.post<TrainingSubmission>(`/twins/${twinId}/training`, data).then((r) => r.data),

    approveSubmission: (twinId: string, submissionId: string) =>
        apiClient.put<TrainingSubmission>(`/twins/${twinId}/training/${submissionId}/approve`).then((r) => r.data),

    rejectSubmission: (twinId: string, submissionId: string) =>
        apiClient.put<TrainingSubmission>(`/twins/${twinId}/training/${submissionId}/reject`).then((r) => r.data),
};
