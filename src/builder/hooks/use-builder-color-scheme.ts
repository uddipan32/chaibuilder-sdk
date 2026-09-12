import { useEffect, useState } from "react";

export const useBuilderColorScheme = () => {
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    const checkTheme = () => {
      const isDark = root.classList.contains("dark") || body.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    checkTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          checkTheme();
        }
      });
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    observer.observe(body, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return {
    isDarkMode: theme === "dark",
  };
};
