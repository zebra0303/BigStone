import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  ChevronLeft,
  Lock,
  Globe,
  Save,
  Moon,
  Palette,
  Type,
  Bell,
} from "lucide-react";
import { Footer } from "@/widgets/footer";

export function AdminPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");

  // Settings State
  const [language, setLanguage] = useState("ko");
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [primaryColor, setPrimaryColor] = useState(
    localStorage.getItem("primary_color") || "#3b82f6",
  );
  const [fontFamily, setFontFamily] = useState(
    localStorage.getItem("font_family") ||
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
  );
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const TIMEZONES = [
    { label: "Seoul (GMT+9)", value: "Asia/Seoul" },
    { label: "Tokyo (GMT+9)", value: "Asia/Tokyo" },
    { label: "UTC", value: "UTC" },
    { label: "London (GMT+0)", value: "Europe/London" },
    { label: "New York (GMT-5)", value: "America/New_York" },
    { label: "Los Angeles (GMT-8)", value: "America/Los_Angeles" },
    { label: "Beijing (GMT+8)", value: "Asia/Shanghai" },
    { label: "Sydney (GMT+11)", value: "Australia/Sydney" },
  ];

  const FONTS = [
    {
      label: t("admin.font_system", "System Default"),
      value:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    },
    { label: "Pretendard", value: "'Pretendard', sans-serif" },
    { label: "NanumSquare Neo", value: "'NanumSquareNeo', sans-serif" },
    { label: "Noto Sans KR", value: "'Noto Sans KR', sans-serif" },
    { label: "Nanum Myeongjo", value: "'Nanum Myeongjo', serif" },
  ];

  useEffect(() => {
    checkStatus();
    if (token) {
      setIsAuthenticated(true);
      fetchSettings(token);
    }
  }, [token]);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/settings/status");
      const data = await res.json();
      setIsSetup(data.isSetup);
    } catch (e) {
      console.error("Failed to fetch admin status", e);
    }
  };

  const fetchSettings = async (jwtToken: string) => {
    try {
      const res = await fetch("/api/settings/config", {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.language) setLanguage(data.language);
        if (data.timezone) setTimezone(data.timezone);
        if (data.slack_webhook_url) setSlackWebhookUrl(data.slack_webhook_url);
      } else {
        // If token is invalid, clear it
        setIsAuthenticated(false);
        localStorage.removeItem("admin_token");
        setToken("");
      }
    } catch (e) {
      console.error("Failed to fetch settings", e);
    }
  };

  const handleSetupOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const endpoint = isSetup ? "/api/settings/login" : "/api/settings/setup";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (isSetup) {
        // Login successful
        localStorage.setItem("admin_token", data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        fetchSettings(data.token);
      } else {
        // Setup successful, now switch to login mode
        setIsSetup(true);
        setPassword("");
        setError(
          t(
            "admin.setup_complete_msg",
            "비밀번호 설정이 완료되었습니다. 다시 로그인해주세요.",
          ),
        );
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          language,
          timezone,
          slack_webhook_url: slackWebhookUrl,
        }),
      });
      if (res.ok) {
        // Update local i18n instance immediately
        i18n.changeLanguage(language);

        // Save theme to localStorage and apply it
        localStorage.setItem("theme", theme);
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }

        // Save primary color to localStorage and apply it
        localStorage.setItem("primary_color", primaryColor);
        document.documentElement.style.setProperty("--primary", primaryColor);

        // Basic brightness check to set foreground color
        const hex = primaryColor.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const foreground = brightness > 155 ? "#000000" : "#ffffff";
        document.documentElement.style.setProperty(
          "--primary-foreground",
          foreground,
        );

        // Save font family to localStorage and apply it
        localStorage.setItem("font_family", fontFamily);
        document.documentElement.style.setProperty("--font-family", fontFamily);

        alert(t("admin.save_success"));
      } else {
        const data = await res.json();
        alert(`${t("common.save_failed", "저장 실패")}: ${data.error}`);
      }
    } catch (e: unknown) {
      alert(`${t("common.save_failed", "저장 실패")}: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setToken("");
    setIsAuthenticated(false);
    setPassword("");
  };

  if (isSetup === null)
    return <div className="p-8 text-center">{t("common.loading")}</div>;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8 space-y-8 min-h-screen">
      <header className="mb-6 flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0 -ml-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
              {t("admin.title")}
            </h1>
          </div>
        </div>
        {isAuthenticated && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="dark:bg-gray-800 dark:border-gray-700"
          >
            {t("admin.logout")}
          </Button>
        )}
      </header>

      {!isAuthenticated ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-sm mx-auto mt-12">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-full mb-4">
              <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {isSetup ? t("admin.login_title") : t("admin.setup_title")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {isSetup ? t("admin.login_desc") : t("admin.setup_desc")}
            </p>
          </div>

          <form onSubmit={handleSetupOrLogin} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder={t("admin.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && (
              <p
                className={`text-sm ${error.includes("완료") || error.includes("complete") ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
              >
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              {isSetup ? t("admin.login_btn") : t("admin.setup_btn")}
            </Button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-6">
              <Globe className="h-5 w-5 text-gray-400 dark:text-gray-500" />{" "}
              {t("admin.lang_title")}
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 shrink-0">
                {t("admin.lang_label")}
              </label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="max-w-xs"
              >
                <option value="ko">🇰🇷 한국어 (Korean)</option>
                <option value="en">🇺🇸 영어 (English)</option>
              </Select>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-6">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 shrink-0">
                {t("admin.timezone_label", "시스템 타임존")}
              </label>
              <Select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="max-w-xs"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-6">
              <Type className="h-5 w-5 text-gray-400 dark:text-gray-500" />{" "}
              {t("admin.font_title", "폰트 설정")}
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 shrink-0">
                {t("admin.font_label", "시스템 폰트")}
              </label>
              <Select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="max-w-xs"
              >
                {FONTS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-6">
              <Moon className="h-5 w-5 text-gray-400 dark:text-gray-500" />{" "}
              {t("admin.theme_title", "테마 설정")}
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 shrink-0">
                {t("admin.theme_label", "화면 테마")}
              </label>
              <Select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="max-w-xs"
              >
                <option value="light">
                  ☀️ {t("admin.theme_light", "라이트")}
                </option>
                <option value="dark">🌙 {t("admin.theme_dark", "다크")}</option>
              </Select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-6">
              <Bell className="h-5 w-5 text-gray-400 dark:text-gray-500" />{" "}
              {t("admin.slack_title", "슬랙 알림 설정")}
            </h3>

            <div className="flex flex-col gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("admin.slack_webhook_label", "슬랙 웹훅 URL")}
              </label>
              <Input
                type="text"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t(
                  "admin.slack_help",
                  "슬랙 워크스페이스의 Incoming Webhook URL을 입력하세요.",
                )}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-6">
              <Palette className="h-5 w-5 text-gray-400 dark:text-gray-500" />{" "}
              {t("admin.color_title", "색상 설정")}
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 shrink-0">
                {t("admin.primary_color_label", "대표 색상")}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                />
                <span className="text-sm font-mono text-gray-500 uppercase">
                  {primaryColor}
                </span>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />{" "}
                {isSaving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
