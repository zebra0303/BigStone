export interface ThemeSettingsPayload {
  theme?: string;
  primary_color?: string;
  font_family?: string;
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

/** Convert a #RRGGBB hex color into a Tailwind-compatible HSL triplet ("H S% L%"). */
export function hexToHslTriplet(hex: string): string | null {
  if (!HEX_COLOR_REGEX.test(hex)) return null;
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return `${h} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

/**
 * Apply theme, primary HSL color tokens, and font family consistently to documentElement
 * so Tailwind's `hsl(var(--primary))` utilities always receive valid HSL channels.
 */
export function applyThemeSettings(settings: ThemeSettingsPayload): void {
  const isDark =
    settings.theme === "dark" ||
    (!settings.theme &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute("content", isDark ? "#111827" : "#ffffff");
  }

  if (settings.primary_color) {
    const hslTriplet = hexToHslTriplet(settings.primary_color);
    if (hslTriplet) {
      document.documentElement.style.setProperty("--primary", hslTriplet);
      const r = Number.parseInt(settings.primary_color.slice(1, 3), 16);
      const g = Number.parseInt(settings.primary_color.slice(3, 5), 16);
      const b = Number.parseInt(settings.primary_color.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      document.documentElement.style.setProperty(
        "--primary-foreground",
        brightness > 155 ? "0 0% 0%" : "0 0% 100%",
      );
    }
  }

  if (settings.font_family) {
    document.documentElement.style.setProperty(
      "--font-family",
      settings.font_family,
    );
  }

  try {
    if (settings.theme) localStorage.setItem("theme", settings.theme);
    if (settings.primary_color)
      localStorage.setItem("primary_color", settings.primary_color);
    if (settings.font_family)
      localStorage.setItem("font_family", settings.font_family);
  } catch {
    /* ignore storage quota errors */
  }
}
