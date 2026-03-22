import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todoApi } from "@/shared/api/todoApi";
import type { Todo } from "@/entities/todo/model/types";
import { useTodoStore } from "@/entities/todo/model/store";
import { useEffect } from "react";

export const TODO_QUERY_KEY = ["todos"];

const TOKEN_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 1 day

// TODO(security): admin_token is stored in localStorage for simplicity.
// Migrate to HttpOnly cookie when backend auth flow supports it.
function tryRefreshToken() {
  const token = localStorage.getItem("admin_token");
  if (!token) return;

  const lastRefresh = parseInt(
    localStorage.getItem("admin_token_refreshed_at") || "0",
    10,
  );
  if (Date.now() - lastRefresh < TOKEN_REFRESH_INTERVAL) return;

  fetch("/api/settings/refresh", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data?.token) {
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("admin_token_refreshed_at", String(Date.now()));
      }
    })
    .catch(() => {});
}

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
      todoApi.updateStatus(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
      tryRefreshToken();
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
      tryRefreshToken();
    },
  });
}

export function useCopyToToday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => todoApi.copyToToday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, file }: { groupId: string; file: File }) =>
      todoApi.uploadAttachment(groupId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) =>
      todoApi.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODO_QUERY_KEY });
    },
  });
}
