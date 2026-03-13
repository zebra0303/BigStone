import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import {
  ChevronLeft,
  CheckCircle,
  XCircle,
  Save,
  Trash2,
  Clock,
  Pin,
  CopyPlus,
} from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Footer } from "@/widgets/footer";
import { getDateLocale } from "@/shared/lib/localeUtils";
import {
  retrospectiveApi,
  type TaskSummary,
  type Retrospective,
} from "@/shared/api/retrospectiveApi";
import { Toast } from "@/shared/ui/Toast";

type PeriodType = "7" | "14" | "30";

export function RetrospectivePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<PeriodType>("7");
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [keepText, setKeepText] = useState("");
  const [problemText, setProblemText] = useState("");
  const [tryText, setTryText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Past retrospectives
  const [pastRetros, setPastRetros] = useState<Retrospective[]>([]);
  const [currentRetroId, setCurrentRetroId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<"tasks" | null>(
    "tasks",
  );

  const periodDays = parseInt(period);
  const endDate = format(new Date(), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), periodDays - 1), "yyyy-MM-dd");

  // Fetch task summary for the selected period
  useEffect(() => {
    retrospectiveApi
      .getTaskSummary(startDate, endDate)
      .then(setSummary)
      .catch(() => {});
  }, [startDate, endDate]);

  // Fetch past retrospectives
  useEffect(() => {
    retrospectiveApi
      .getAll()
      .then(setPastRetros)
      .catch(() => {});
  }, []);

  const completionRate = useMemo(() => {
    if (!summary || summary.total === 0) return 0;
    return Math.round((summary.completed / summary.total) * 100);
  }, [summary]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    if (!summary) return {};
    const grouped: Record<string, typeof summary.tasks> = {};
    summary.tasks.forEach((task) => {
      if (!grouped[task.dueDate]) grouped[task.dueDate] = [];
      grouped[task.dueDate].push(task);
    });
    return grouped;
  }, [summary]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      if (currentRetroId) {
        await retrospectiveApi.update(currentRetroId, {
          keepText,
          problemText,
          tryText,
        });
      } else {
        const result = await retrospectiveApi.create({
          periodStart: startDate,
          periodEnd: endDate,
          keepText,
          problemText,
          tryText,
        });
        setCurrentRetroId(result.id);
      }
      setToastMessage(t("retro.saved", "회고가 저장되었습니다"));
      // Refresh list
      const retros = await retrospectiveApi.getAll();
      setPastRetros(retros);
    } catch {
      setToastMessage(t("common.save_failed", "저장 실패"));
    } finally {
      setIsSaving(false);
    }
  }, [currentRetroId, keepText, problemText, tryText, startDate, endDate, t]);

  const handleLoadRetro = (retro: Retrospective) => {
    setCurrentRetroId(retro.id);
    setKeepText(retro.keepText);
    setProblemText(retro.problemText);
    setTryText(retro.tryText);
    // Load the corresponding task summary
    retrospectiveApi
      .getTaskSummary(retro.periodStart, retro.periodEnd)
      .then(setSummary)
      .catch(() => {});
  };

  const handleDeleteRetro = async (id: string) => {
    try {
      await retrospectiveApi.delete(id);
      setPastRetros((prev) => prev.filter((r) => r.id !== id));
      if (currentRetroId === id) {
        setCurrentRetroId(null);
        setKeepText("");
        setProblemText("");
        setTryText("");
      }
      setToastMessage(t("retro.deleted", "회고가 삭제되었습니다"));
    } catch {
      setToastMessage(t("common.save_failed", "삭제 실패"));
    }
  };

  const handleNewRetro = () => {
    setCurrentRetroId(null);
    setKeepText("");
    setProblemText("");
    setTryText("");
    // Reset to current period
    retrospectiveApi
      .getTaskSummary(startDate, endDate)
      .then(setSummary)
      .catch(() => {});
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-6 min-h-screen">
      {/* Header */}
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="shrink-0 flex items-center gap-1 -ml-2 text-gray-500 hover:!text-primary transition-colors font-bold"
          >
            <ChevronLeft className="h-5 w-5" />
            {t("common.today", "Home")}
          </Button>

          <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <img
              src="/bigxi.png"
              alt="BigXi"
              className="w-8 h-8 object-contain drop-shadow-sm"
            />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100">
                {t("retro.title")}
              </h1>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("retro.subtitle")}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewRetro}
          className="dark:bg-gray-800 dark:border-gray-700"
        >
          {t("retro.new", "새 회고")}
        </Button>
      </header>

      {/* Period Selector */}
      {!currentRetroId && (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("retro.period", "기간")}:
          </span>
          {(["7", "14", "30"] as PeriodType[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? "primary" : "outline"}
              size="xs"
              onClick={() => setPeriod(p)}
              className="px-3"
              style={
                period === p
                  ? {
                      backgroundColor: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }
                  : {}
              }
            >
              {p}
              {t("common.day_unit", "일")}
            </Button>
          ))}
        </div>
      )}

      {/* Summary Dashboard */}
      {summary && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              {t("retro.summary", "요약")}
            </h3>
            <span className="text-xs text-gray-400">
              {startDate} ~ {endDate}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {summary.total}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("retro.total", "전체")}
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {summary.completed}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("retro.completed", "완료")}
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">
                {summary.incomplete}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {t("retro.incomplete", "미완료")}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">
                {t("retro.completion_rate", "달성률")}
              </span>
              <span className="font-bold text-gray-700 dark:text-gray-200">
                {completionRate}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${completionRate}%`,
                  backgroundColor: "var(--primary)",
                }}
              />
            </div>
          </div>

          {/* Task List (collapsible) */}
          <div>
            <button
              onClick={() =>
                setExpandedSection(expandedSection === "tasks" ? null : "tasks")
              }
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
            >
              {expandedSection === "tasks" ? "▼" : "▶"}{" "}
              {t("retro.task_list", "일정 목록")}
            </button>
            {expandedSection === "tasks" && (
              <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                {Object.entries(tasksByDate).map(([date, tasks]) => (
                  <div key={date}>
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1">
                      {format(
                        new Date(date),
                        t("task.date_format", "M월 d일"),
                        {
                          locale: getDateLocale(),
                        },
                      )}
                    </div>
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-2 py-1 text-sm"
                      >
                        {task.status === "DONE" ? (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        ) : task.status === "IN_PROGRESS" ? (
                          <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                        )}
                        <span
                          className={`truncate ${task.status === "DONE" ? "text-gray-500 dark:text-gray-400 line-through" : task.status === "IN_PROGRESS" ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-200"}`}
                        >
                          {task.title}
                        </span>
                        {/* Origin indicator badges for pinned/copied tasks */}
                        {task.isPinned && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                            <Pin className="h-2.5 w-2.5" />
                            {t("task.pinned", "고정")}
                          </span>
                        )}
                        {task.isCopied && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 shrink-0">
                            <CopyPlus className="h-2.5 w-2.5" />
                            {t("task.copied", "복사됨")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPT Writing Section */}
      <div className="space-y-4">
        {/* Keep */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-900 p-5">
          <h3 className="text-sm font-bold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xs">
              K
            </span>
            Keep - {t("retro.keep_label", "잘한 점, 계속 유지할 것")}
          </h3>
          <textarea
            value={keepText}
            onChange={(e) => setKeepText(e.target.value)}
            placeholder={t(
              "retro.keep_placeholder",
              "이번 기간에 잘한 점, 앞으로도 계속하고 싶은 것을 적어보세요...",
            )}
            className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-300 dark:focus:ring-green-800 resize-y"
          />
        </div>

        {/* Problem */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900 p-5">
          <h3 className="text-sm font-bold text-red-500 dark:text-red-400 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-xs">
              P
            </span>
            Problem - {t("retro.problem_label", "아쉬운 점, 문제였던 것")}
          </h3>
          <textarea
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            placeholder={t(
              "retro.problem_placeholder",
              "아쉬웠던 점, 개선이 필요하다고 느낀 것을 적어보세요...",
            )}
            className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-800 resize-y"
          />
        </div>

        {/* Try */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-900 p-5">
          <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs">
              T
            </span>
            Try - {t("retro.try_label", "다음에 시도할 개선 사항")}
          </h3>
          <textarea
            value={tryText}
            onChange={(e) => setTryText(e.target.value)}
            placeholder={t(
              "retro.try_placeholder",
              "다음 기간에 새롭게 시도하거나 개선하고 싶은 것을 적어보세요...",
            )}
            className="w-full min-h-[100px] p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-800 resize-y"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving
              ? t("common.saving", "저장 중...")
              : t("common.save", "저장")}
          </Button>
        </div>
      </div>

      {/* Past Retrospectives */}
      {pastRetros.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-300">
            {t("retro.history", "지난 회고")}
          </h3>
          {pastRetros.map((retro) => (
            <div
              key={retro.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                currentRetroId === retro.id
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
              onClick={() => handleLoadRetro(retro)}
            >
              <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {retro.periodStart} ~ {retro.periodEnd}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {t("retro.created_at", "작성")}:{" "}
                  {format(new Date(retro.createdAt), "yyyy-MM-dd HH:mm")}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRetro(retro.id);
                }}
                className="h-7 w-7 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      )}
      <Footer />
    </div>
  );
}
