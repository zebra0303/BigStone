import { apiClient } from "./client";

export interface TaskSummary {
  total: number;
  completed: number;
  incomplete: number;
  tasks: {
    id: string;
    title: string;
    dueDate: string;
    status: string;
    priority: string;
    completedAt: string | null;
    isPinned?: boolean;
    isCopied?: boolean;
  }[];
}

export interface Retrospective {
  id: string;
  periodStart: string;
  periodEnd: string;
  keepText: string;
  problemText: string;
  tryText: string;
  createdAt: string;
  updatedAt: string;
}

// Migrated to @zebra/core ApiClient for consistent error handling and 401 session sync
export const retrospectiveApi = {
  getAll: async (): Promise<Retrospective[]> => {
    return apiClient.get<Retrospective[]>("/retrospectives");
  },

  getById: async (id: string): Promise<Retrospective> => {
    return apiClient.get<Retrospective>(`/retrospectives/${id}`);
  },

  getTaskSummary: async (start: string, end: string): Promise<TaskSummary> => {
    const params = new URLSearchParams({ start, end });
    return apiClient.get<TaskSummary>(
      `/retrospectives/summary/tasks?${params.toString()}`,
    );
  },

  create: async (data: {
    periodStart: string;
    periodEnd: string;
    keepText?: string;
    problemText?: string;
    tryText?: string;
  }): Promise<Retrospective> => {
    return apiClient.post<Retrospective>("/retrospectives", data);
  },

  update: async (
    id: string,
    data: { keepText?: string; problemText?: string; tryText?: string },
  ): Promise<{ message: string; updatedAt: string }> => {
    return apiClient.put<{ message: string; updatedAt: string }>(
      `/retrospectives/${id}`,
      data,
    );
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/retrospectives/${id}`);
  },
};
