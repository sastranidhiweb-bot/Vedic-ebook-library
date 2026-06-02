import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "dark" | "light" | "system" | "krishna";
type ResolvedTheme = "dark" | "light" | "krishna";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = "vedic_theme";

function getSystemScheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return getSystemScheme();
  return mode;
}

function applyToDOM(resolved: ResolvedTheme) {
  document.body.setAttribute("data-theme", resolved);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
    const resolved = resolveTheme(saved);
    setThemeState(saved);
    setResolvedTheme(resolved);
    applyToDOM(resolved);
    document.body.style.zoom = "100%";

    // Keep system theme in sync with OS preference changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      const current = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) ?? "system";
      if (current === "system") {
        const r = getSystemScheme();
        setResolvedTheme(r);
        applyToDOM(r);
      }
    };
    mq.addEventListener("change", onSystemChange);

    // Sync across tabs
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const t = (e.newValue as ThemeMode | null) ?? "system";
        const r = resolveTheme(t);
        setThemeState(t);
        setResolvedTheme(r);
        applyToDOM(r);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      mq.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    const resolved = resolveTheme(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    setThemeState(newTheme);
    setResolvedTheme(resolved);
    applyToDOM(resolved);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
