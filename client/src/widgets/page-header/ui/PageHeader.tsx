import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { Button } from "@zebra/core/client";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  rightSlot?: ReactNode;
}

// Reusable sub-page header extracted from AdminPage, RetrospectivePage, and SearchPage
export function PageHeader({
  title,
  subtitle,
  backTo = "/",
  backLabel,
  rightSlot,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(backTo)}
          className="shrink-0 flex items-center gap-1 -ml-2 text-gray-500 hover:!text-primary transition-colors font-bold"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          {backLabel ?? t("common.today", "Home")}
        </Button>

        <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />

        <div className="flex items-center gap-3">
          <img
            src="/bigxi.png"
            alt="BigXi"
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </header>
  );
}
