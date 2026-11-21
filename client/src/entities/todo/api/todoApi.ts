import { apiClient } from "@/shared/api/client";
import { z } from "zod";
import { format } from "date-fns";
import type { Todo } from "../model/types";
import { TodoSchema } from "../model/schema";

// Moved from shared/api to entities/todo/api to comply with FSD layer boundaries
export const todoApi = {
  getAll: async (): Promise<Todo[]> => {
    const data = await apiClient.get<unknown>("/todos");
    return z.array(TodoSchema).parse(data) as Todo[];
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
    return apiClient.post<{ id: string; groupId: string }>("/todos", payload);
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
    return apiClient.put<{ message: string }>(`/todos/${id}`, payload);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/todos/${id}`);
  },

  completeVirtual: async (id: string, targetDate: string): Promise<void> => {
    await apiClient.post(`/todos/${id}/complete-virtual`, { targetDate });
  },

  copyToToday: async (id: string): Promise<{ id: string; groupId: string }> => {
    return apiClient.post<{ id: string; groupId: string }>(
      `/todos/${id}/copy-to-today`,
    );
  },

  uploadAttachment: async (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.upload(`/todos/attachments/${groupId}`, formData);
  },

  deleteAttachment: async (attachmentId: string) => {
    return apiClient.delete(`/todos/attachments/${attachmentId}`);
  },
};
