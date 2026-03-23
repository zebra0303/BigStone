import { describe, it, expect, beforeEach } from "vitest";
import { useTodoStore } from "../store";
import type { Todo } from "../types";

const makeTodo = (overrides: Partial<Todo> = {}): Omit<Todo, "id"> => ({
  title: "Test todo",
  description: "A test description",
  isImportant: false,
  priority: "MEDIUM",
  isPinned: false,
  isCopied: false,
  dueDate: new Date("2026-03-23"),
  status: "TODO",
  recurring: { type: "NONE" },
  ...overrides,
});

describe("useTodoStore", () => {
  beforeEach(() => {
    // Reset the store state before each test
    useTodoStore.setState({ todos: [] });
  });

  it("starts with an empty todos array", () => {
    expect(useTodoStore.getState().todos).toEqual([]);
  });

  describe("addTodo", () => {
    it("adds a todo with a generated id", () => {
      useTodoStore.getState().addTodo(makeTodo({ title: "New task" }));
      const todos = useTodoStore.getState().todos;
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe("New task");
      expect(todos[0].id).toBeDefined();
      expect(typeof todos[0].id).toBe("string");
    });

    it("generates unique IDs for each todo", () => {
      useTodoStore.getState().addTodo(makeTodo({ title: "First" }));
      useTodoStore.getState().addTodo(makeTodo({ title: "Second" }));
      const todos = useTodoStore.getState().todos;
      expect(todos).toHaveLength(2);
      expect(todos[0].id).not.toBe(todos[1].id);
    });
  });

  describe("updateTodo", () => {
    it("updates the specified fields of a todo", () => {
      useTodoStore.getState().addTodo(makeTodo({ title: "Original" }));
      const id = useTodoStore.getState().todos[0].id;

      useTodoStore
        .getState()
        .updateTodo(id, { title: "Updated", priority: "HIGH" });
      const updated = useTodoStore.getState().todos[0];
      expect(updated.title).toBe("Updated");
      expect(updated.priority).toBe("HIGH");
      expect(updated.description).toBe("A test description"); // unchanged
    });

    it("does not modify other todos", () => {
      useTodoStore.getState().addTodo(makeTodo({ title: "Keep me" }));
      useTodoStore.getState().addTodo(makeTodo({ title: "Change me" }));
      const todos = useTodoStore.getState().todos;
      const targetId = todos[1].id;

      useTodoStore.getState().updateTodo(targetId, { title: "Changed" });
      const result = useTodoStore.getState().todos;
      expect(result[0].title).toBe("Keep me");
      expect(result[1].title).toBe("Changed");
    });
  });

  describe("deleteTodo", () => {
    it("removes a todo by id", () => {
      useTodoStore.getState().addTodo(makeTodo({ title: "Delete me" }));
      useTodoStore.getState().addTodo(makeTodo({ title: "Keep me" }));
      const deleteId = useTodoStore.getState().todos[0].id;

      useTodoStore.getState().deleteTodo(deleteId);
      const todos = useTodoStore.getState().todos;
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe("Keep me");
    });

    it("does nothing if the id is not found", () => {
      useTodoStore.getState().addTodo(makeTodo());
      useTodoStore.getState().deleteTodo("nonexistent-id");
      expect(useTodoStore.getState().todos).toHaveLength(1);
    });
  });

  describe("toggleStatus", () => {
    it("toggles TODO → DONE and sets completedAt", () => {
      useTodoStore.getState().addTodo(makeTodo({ status: "TODO" }));
      const id = useTodoStore.getState().todos[0].id;

      useTodoStore.getState().toggleStatus(id);
      const todo = useTodoStore.getState().todos[0];
      expect(todo.status).toBe("DONE");
      expect(todo.completedAt).toBeInstanceOf(Date);
    });

    it("toggles DONE → TODO and clears completedAt", () => {
      useTodoStore
        .getState()
        .addTodo(makeTodo({ status: "DONE", completedAt: new Date() }));
      const id = useTodoStore.getState().todos[0].id;

      useTodoStore.getState().toggleStatus(id);
      const todo = useTodoStore.getState().todos[0];
      expect(todo.status).toBe("TODO");
      expect(todo.completedAt).toBeUndefined();
    });

    it("does not affect other todos", () => {
      useTodoStore.getState().addTodo(makeTodo({ title: "A", status: "TODO" }));
      useTodoStore.getState().addTodo(makeTodo({ title: "B", status: "TODO" }));
      const id = useTodoStore.getState().todos[0].id;

      useTodoStore.getState().toggleStatus(id);
      expect(useTodoStore.getState().todos[0].status).toBe("DONE");
      expect(useTodoStore.getState().todos[1].status).toBe("TODO");
    });
  });
});
