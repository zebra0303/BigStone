import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTodos, TodoList } from "@/features/todo";
import { Input } from "@zebra/core/client";
import { Select } from "@/shared/ui";
import { Search as SearchIcon } from "lucide-react";
import type { Todo } from "@/entities/todo";
import { safeParseDate } from "@/shared/lib";
import { Footer } from "@/widgets/footer";
import { PageHeader } from "@/widgets/page-header";

type FilterStatus = "ALL" | "TODO" | "IN_PROGRESS" | "DONE";

const PRIORITY_ORDER = { HIGH: 3, MEDIUM: 2, LOW: 1 };

function getPriorityScore(todo: Todo): number {
  if (todo.priority) return PRIORITY_ORDER[todo.priority];
  return todo.isImportant ? PRIORITY_ORDER.HIGH : PRIORITY_ORDER.MEDIUM;
}

export function SearchPage() {
  const { t } = useTranslation();
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
        filterStatus === "ALL" || todo.status === filterStatus;

      return matchKeyword && matchStatus;
    });

    // 2. Deduplicate recurring tasks: prefer active (non-DONE) instances over past DONE ones
    const groupMap = new Map<string, Todo>();

    filtered.forEach((todo) => {
      const gId = todo.groupId || todo.id;

      if (!groupMap.has(gId)) {
        groupMap.set(gId, todo);
      } else {
        const existing = groupMap.get(gId)!;
        const existingActive = existing.status !== "DONE";
        const currentActive = todo.status !== "DONE";

        if (currentActive && !existingActive) {
          groupMap.set(gId, todo);
          return;
        }
        if (existingActive && !currentActive) {
          return;
        }

        const existingDate = safeParseDate(existing.dueDate).getTime();
        const currentDate = safeParseDate(todo.dueDate).getTime();
        if (currentDate < existingDate) {
          groupMap.set(gId, todo);
        }
      }
    });

    // 3. Sort results by priority (HIGH > MEDIUM > LOW), then dueDate
    return Array.from(groupMap.values()).sort((a, b) => {
      const scoreDiff = getPriorityScore(b) - getPriorityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (
        safeParseDate(a.dueDate).getTime() - safeParseDate(b.dueDate).getTime()
      );
    });
  }, [todos, keyword, filterStatus]);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-8 min-h-screen">
      <PageHeader
        title={t("common.search")}
        subtitle={t("common.search_desc")}
      />

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
            <option value="TODO">{t("common.todo_status", "할 일")}</option>
            <option value="IN_PROGRESS">
              {t("common.in_progress_status", "진행중")}
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
