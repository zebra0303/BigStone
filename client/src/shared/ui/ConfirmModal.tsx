import { useTranslation } from "react-i18next";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant = "danger",
}: ConfirmModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const variantStyles = {
    danger: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
    warning: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
    info: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  };

  const buttonVariants = {
    danger: "destructive" as const,
    warning: "default" as const,
    info: "default" as const,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-full ${variantStyles[variant]}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {message}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {cancelLabel || t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant={buttonVariants[variant]}
              onClick={() => {
                onConfirm();
                onCancel();
              }}
            >
              {confirmLabel || t("common.confirm", "Confirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
