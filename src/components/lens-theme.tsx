import { useId, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_KEY = "lens-theme";
const THEME_EVENT = "lens-theme-change";
const THEMES = [
  { value: "system", label: "시스템", icon: Monitor },
  { value: "light", label: "라이트", icon: Sun },
  { value: "dark", label: "다크", icon: Moon },
] as const;

export const initializeLensTheme = `try {
  var theme = localStorage.getItem(${JSON.stringify(THEME_KEY)});
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {}`;

function getTheme() {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark" ? theme : "system";
}

function subscribe(onChange: () => void) {
  function syncTheme(event: StorageEvent) {
    if (event.key !== THEME_KEY && event.key !== null) return;
    applyTheme(event.newValue);
    onChange();
  }

  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", syncTheme);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", syncTheme);
  };
}

function applyTheme(theme: string | null) {
  if (theme === "light" || theme === "dark")
    document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

function changeTheme(theme: (typeof THEMES)[number]["value"]) {
  applyTheme(theme);
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // A storage restriction still leaves the selected theme active for this page.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function LensTheme() {
  const name = useId();
  const theme = useSyncExternalStore(
    subscribe,
    getTheme,
    () => "system" as const,
  );

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 px-1 text-sm font-medium text-muted">
        화면 테마
      </legend>
      <div className="grid grid-cols-3 gap-1 rounded-[18px] bg-surface-2 p-1">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "relative flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[14px] text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
              value === theme ? "bg-surface text-fg shadow-xs" : "text-muted",
            )}
          >
            <input
              type="radio"
              name={name}
              value={value}
              className="sr-only"
              checked={value === theme}
              onChange={() => changeTheme(value)}
            />
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
