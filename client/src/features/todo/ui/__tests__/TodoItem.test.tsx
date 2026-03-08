import { render, screen, fireEvent } from "@testing-library/react";
import { TodoItem } from "../TodoItem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";

// Mock the hooks
vi.mock("@/features/todo/model/hooks", () => ({
  useUpdateTodoStatus: () => ({ mutate: vi.fn() }),
  useDeleteTodo: () => ({ mutate: vi.fn() }),
  useCreateTodo: () => ({ mutate: vi.fn() }),
  useCompleteVirtualTodo: () => ({ mutate: vi.fn() }),
  useCopyToToday: () => ({ mutate: vi.fn() }),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "task.date_format") return "M/d";
      return key;
    },
  }),
}));

const mockTodo = {
  id: "1",
  title: "Test Task",
  description: "Test Description details that should be hidden initially",
  isImportant: true,
  dueDate: new Date(),
  status: "TODO" as const,
  recurring: { type: "NONE" as const },
};

const queryClient = new QueryClient();

describe("TodoItem Expanded View", () => {
  it("should toggle the description visibility on click", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TodoItem todo={mockTodo} />
      </QueryClientProvider>,
    );

    // Should only be truncated initially (in the summary row)
    const summaryDesc = screen.getByText(
      "Test Description details that should be hidden initially",
    );
    expect(summaryDesc).toHaveClass("truncate");

    // Click the main body to expand
    const bodyContainer = summaryDesc.closest(".cursor-pointer");
    if (bodyContainer) fireEvent.click(bodyContainer);

    // After click, the expanded block should exist
    const expandedBlocks = screen.getAllByText(
      "Test Description details that should be hidden initially",
    );

    // There should now be two matches (one truncated in DOM but hidden by !isExpanded check, one expanded)
    // Actually the truncated one unmounts based on `todo.description && !isExpanded`
    expect(expandedBlocks.length).toBe(1);
    expect(expandedBlocks[0]).not.toHaveClass("truncate");
  });
});
