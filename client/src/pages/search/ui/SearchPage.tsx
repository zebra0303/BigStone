import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTodos } from "@/features/todo/model/hooks";
import { TodoList } from "@/features/todo/ui/TodoList";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { ChevronLeft, Search as SearchIcon } from "lucide-react";
import type { Todo } from "@/entities/todo/model/types";
import { Footer } from "@/widgets/footer";

type FilterStatus = "ALL" | "TODO" | "DONE";

export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: todos = [] } = useTodos();

  const [keyword, setKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");

  const searchResults = useMemo(() => {
    // 1. Keyword and Status Filtering
    const filtered = todos.filter((todo) => {
      const matchKeyword =
        !keyword ||
        todo.title.toLowerCase().includes(keyword.toLowerCase()) ||
        todo.description?.toLowerCase().includes(keyword.toLowerCase());

      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "TODO" && todo.status !== "DONE") ||
        (filterStatus === "DONE" && todo.status === "DONE");

      return matchKeyword && matchStatus;
    });

    // 2. Deduplicate recurring tasks (Keep only one per groupId)
    // If it's a standalone task, groupId might be undefined depending on DB, but our backend assigns groupId to all tasks.
    // We will keep the earliest due date instance among the matches for a group.
    const groupMap = new Map<string, Todo>();

    filtered.forEach((todo) => {
      const gId = todo.groupId || todo.id; // fallback to id if no groupId

      if (!groupMap.has(gId)) {
        groupMap.set(gId, todo);
      } else {
        // Keep the one with the earlier due date (closest to today/past)
        const existing = groupMap.get(gId)!;
        const existingDate = new Date(existing.dueDate).getTime();
        const currentDate = new Date(todo.dueDate).getTime();

        if (currentDate < existingDate) {
          groupMap.set(gId, todo);
        }
      }
    });

    // 3. Sort results (Important first, then by dueDate)
    return Array.from(groupMap.values()).sort((a, b) => {
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [todos, keyword, filterStatus]);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-8 min-h-screen">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex items-center gap-3">
          <img
            src="/stone.png"
            alt="Big Stone Mascot"
            className="w-12 h-12 object-contain drop-shadow-sm opacity-80"
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
              {t("common.search")}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t(
                "common.search_desc",
                "모든 일정을 한곳에서 찾아보고 수정하세요.",
              )}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="shrink-0 flex items-center gap-2 dark:bg-gray-800 dark:border-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />{" "}
          {t("admin.back_to_home", "홈으로 돌아가기")}
        </Button>
      </header>

      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder={t(
                "task.search_placeholder",
                "일정 제목이나 내용을 검색하세요...",
              )}
              className="pl-10 w-full"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="w-full md:w-40"
          >
            <option value="ALL">{t("common.all_status", "모든 상태")}</option>
            <option value="TODO">
              {t("common.todo_status", "진행 중 (할 일)")}
            </option>
            <option value="DONE">{t("common.done_status", "완료됨")}</option>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {t("common.search_result", "검색 결과")}
          </h2>
          <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
            {searchResults.length} {t("common.count_unit", "건")}
          </span>
        </div>

        {searchResults.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {t(
                "common.no_search_results",
                "조건에 맞는 일정을 찾을 수 없습니다.",
              )}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <TodoList
              todos={searchResults}
              emptyMessage={t(
                "common.no_search_results",
                "조건에 맞는 일정을 찾을 수 없습니다.",
              )}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
