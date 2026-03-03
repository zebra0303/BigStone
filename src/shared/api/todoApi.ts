import type { Todo } from "@/entities/todo/model/types";

const API_BASE = "http://localhost:3000/api/todos";

export const todoApi = {
  getAll: async (): Promise<Todo[]> => {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error("Failed to fetch todos");
    return res.json();
  },

  create: async (todo: Omit<Todo, "id">): Promise<Todo> => {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo),
    });
    if (!res.ok) throw new Error("Failed to create todo");
    return res.json();
  },

  update: async (id: string, todo: Partial<Todo>): Promise<void> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo),
    });
    if (!res.ok) throw new Error("Failed to update todo");
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete todo");
  },
};
