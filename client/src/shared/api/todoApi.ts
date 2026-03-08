import type { Todo } from "@/entities/todo/model/types";
import { TodoSchema } from "@/entities/todo/model/schema";
import { z } from "zod";
import { handleApiError } from "@/shared/lib/errors";
import { format } from "date-fns";

const API_BASE = "/api/todos";

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("admin_token");
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const todoApi = {
  getAll: async (): Promise<Todo[]> => {
    const res = await fetch(API_BASE);
    if (!res.ok) await handleApiError(res, "Failed to fetch todos");
    const data = await res.json();
    try {
      return z.array(TodoSchema).parse(data) as Todo[];
    } catch (e) {
      console.error("Zod Parsing Error:", e);
      // Fallback to avoid complete failure if possible, or rethrow
      throw e;
    }
  },

  create: async (
    todo: Omit<Todo, "id" | "groupId">,
  ): Promise<{ id: string; groupId: string }> => {
    const payload = {
      ...todo,
      dueDate:
        todo.dueDate instanceof Date
          ? format(todo.dueDate, "yyyy-MM-dd")
          : todo.dueDate,
    };
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) await handleApiError(res, "Failed to create todo");
    return res.json();
  },

  updateStatus: async (
    id: string,
    updates: Partial<Todo>,
  ): Promise<{ message: string }> => {
    const payload = {
      ...updates,
      dueDate:
        updates.dueDate instanceof Date
          ? format(updates.dueDate, "yyyy-MM-dd")
          : updates.dueDate,
    };
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) await handleApiError(res, "Failed to update todo");
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) await handleApiError(res, "Failed to delete todo");
  },

  completeVirtual: async (id: string, targetDate: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/${id}/complete-virtual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ targetDate }),
    });
    if (!res.ok) await handleApiError(res, "Failed to complete virtual todo");
  },

  copyToToday: async (id: string): Promise<{ id: string; groupId: string }> => {
    const res = await fetch(`${API_BASE}/${id}/copy-to-today`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!res.ok) await handleApiError(res, "Failed to copy todo to today");
    return res.json();
  },

  uploadAttachment: async (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/attachments/${groupId}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    if (!res.ok) await handleApiError(res, "Failed to upload attachment");
    return res.json();
  },

  deleteAttachment: async (attachmentId: string) => {
    const res = await fetch(`${API_BASE}/attachments/${attachmentId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    if (!res.ok) await handleApiError(res, "Failed to delete attachment");
    return res.json();
  },
};
