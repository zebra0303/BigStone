import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todoApi } from "@/shared/api/todoApi";
import type { Todo } from "@/entities/todo/model/types";
import { useTodoStore } from "@/entities/todo/model/store";
import { useEffect } from "react";

export const TODO_QUERY_KEY = ["todos"];

export function useTodos() {
  const query = useQuery({
    queryKey: TODO_QUERY_KEY,
    queryFn: todoApi.getAll,
  });

  // Sync Query Data to Zustand Store if needed for global access (optional but good for hybrid approach)
  useEffect(() => {
    if (query.data) {
      useTodoStore.setState({ todos: query.data });
    }
  }, [query.data]);

  return query;
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newTodo: Omit<Todo, "id">) => todoApi.create(newTodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useUpdateTodoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Todo> }) =>
      todoApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => todoApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useCompleteVirtualTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, targetDate }: { id: string; targetDate: string }) =>
      todoApi.completeVirtual(id, targetDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}
