import { ko, enUS } from "date-fns/locale";
import i18n from "i18next";

export function getDateLocale() {
  const lang = i18n.language || "ko";
  if (lang.startsWith("en")) return enUS;
  return ko;
}
