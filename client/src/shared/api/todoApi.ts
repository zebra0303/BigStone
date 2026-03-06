import type { Todo } from "@/entities/todo/model/types";

const API_BASE = "/api/todos";

export const todoApi = {
  getAll: async (): Promise<Todo[]> => {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Failed to fetch todos");
    return res.json();
  },

  create: async (
    todo: Omit<Todo, "id" | "groupId">,
  ): Promise<{ id: string; groupId: string }> => {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo),
    });
    if (!res.ok) throw new Error("Failed to create todo");
    return res.json();
  },

  updateStatus: async (
    id: string,
    updates: Partial<Todo>,
  ): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update todo");
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete todo");
  },

  completeVirtual: async (id: string, targetDate: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/${id}/complete-virtual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetDate }),
    });
    if (!res.ok) throw new Error("Failed to complete virtual todo");
  },

  uploadAttachment: async (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/attachments/${groupId}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload attachment");
    return res.json();
  },

  deleteAttachment: async (attachmentId: string) => {
    const res = await fetch(`${API_BASE}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete attachment");
    return res.json();
  },
};
