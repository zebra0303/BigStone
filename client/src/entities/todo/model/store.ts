import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Todo } from "./types";

interface TodoState {
  todos: Todo[];
  addTodo: (todo: Omit<Todo, "id">) => void;
  updateTodo: (id: string, todo: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  toggleStatus: (id: string) => void;
}

export const useTodoStore = create<TodoState>()(
  persist(
    (set) => ({
      todos: [],
      addTodo: (todo) =>
        set((state) => ({
          todos: [...state.todos, { ...todo, id: crypto.randomUUID() }],
        })),
      updateTodo: (id, updatedFields) =>
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id ? { ...todo, ...updatedFields } : todo,
          ),
        })),
      deleteTodo: (id) =>
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        })),
      toggleStatus: (id) =>
        set((state) => ({
          todos: state.todos.map((todo) => {
            if (todo.id !== id) return todo;
            const newStatus = todo.status === "DONE" ? "TODO" : "DONE";
            return {
              ...todo,
              status: newStatus,
              completedAt: newStatus === "DONE" ? new Date() : undefined,
            };
          }),
        })),
    }),
    {
      name: "bigstone-todo-storage",
    },
  ),
);
