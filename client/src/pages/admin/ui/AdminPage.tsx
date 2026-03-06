import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { ChevronLeft, Lock, Globe, Save } from "lucide-react";

export function AdminPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isSetup, setIsSetup] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState(
    localStorage.getItem("admin_token") || "",
  );

  // Settings State
  const [language, setLanguage] = useState("ko");
  const [isSaving, setIsSaving] = useState(false);

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
        setError(t("admin.setup_complete_msg", "비밀번호 설정이 완료되었습니다. 다시 로그인해주세요."));
      }
    } catch (e: any) {
      setError(e.message);
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
        body: JSON.stringify({ language }),
      });
      if (res.ok) {
        // Update local i18n instance immediately
        i18n.changeLanguage(language);
        alert(t("admin.save_success"));
      } else {
        const data = await res.json();
        alert(`${t("common.save_failed", "저장 실패")}: ${data.error}`);
      }
    } catch (e: any) {
      alert(`${t("common.save_failed", "저장 실패")}: ${e.message}`);
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
    <div className="mx-auto max-w-2xl p-4 md:p-8 space-y-8">
      <header className="mb-6 flex items-center justify-between gap-4 border-b border-gray-200 pb-6">
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-800">
              {t("admin.title")}
            </h1>
          </div>
        </div>
        {isAuthenticated && (
          <Button variant="outline" size="sm" onClick={handleLogout}>
            {t("admin.logout")}
          </Button>
        )}
      </header>

      {!isAuthenticated ? (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-sm mx-auto mt-12">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="bg-blue-50 p-3 rounded-full mb-4">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              {isSetup ? t("admin.login_title") : t("admin.setup_title")}
            </h2>
            <p className="text-sm text-gray-500 mt-2">
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
                className={`text-sm ${error.includes("완료") || error.includes("complete") ? "text-green-600" : "text-red-500"}`}
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
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-6">
              <Globe className="h-5 w-5 text-gray-400" /> {t("admin.lang_title")}
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-medium text-gray-700 w-32 shrink-0">
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
    </div>
  );
}