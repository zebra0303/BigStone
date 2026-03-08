import { handleApiError } from "@/shared/lib/errors";

const API_BASE = "/api/retrospectives";

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("admin_token");
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

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

export const retrospectiveApi = {
  getAll: async (): Promise<Retrospective[]> => {
    const res = await fetch(API_BASE);
    if (!res.ok) await handleApiError(res, "Failed to fetch retrospectives");
    return res.json();
  },

  getById: async (id: string): Promise<Retrospective> => {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) await handleApiError(res, "Failed to fetch retrospective");
    return res.json();
  },

  getTaskSummary: async (start: string, end: string): Promise<TaskSummary> => {
    const res = await fetch(
      `${API_BASE}/summary/tasks?start=${start}&end=${end}`,
    );
    if (!res.ok) await handleApiError(res, "Failed to fetch task summary");
    return res.json();
  },

  create: async (data: {
    periodStart: string;
    periodEnd: string;
    keepText?: string;
    problemText?: string;
    tryText?: string;
  }): Promise<Retrospective> => {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) await handleApiError(res, "Failed to create retrospective");
    return res.json();
  },

  update: async (
    id: string,
    data: { keepText?: string; problemText?: string; tryText?: string },
  ): Promise<{ message: string; updatedAt: string }> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) await handleApiError(res, "Failed to update retrospective");
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) await handleApiError(res, "Failed to delete retrospective");
  },
};
