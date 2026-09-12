import tailwindContainerQueries from "@tailwindcss/container-queries";
import tailwindForms from "@tailwindcss/forms";
import tailwindTypography from "@tailwindcss/typography";

function shadcnTheme() {
  return {
    textColor: {
      DEFAULT: "hsl(var(--foreground))",
    },
    colors: {
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      surface: "hsl(var(--surface))",
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      secondary: {
        DEFAULT: "hsl(var(--secondary))",
        foreground: "hsl(var(--secondary-foreground))",
      },
      destructive: {
        DEFAULT: "hsl(var(--destructive))",
        foreground: "hsl(var(--destructive-foreground))",
      },
      muted: {
        DEFAULT: "hsl(var(--muted))",
        foreground: "hsl(var(--muted-foreground))",
      },
      accent: {
        DEFAULT: "hsl(var(--accent))",
        foreground: "hsl(var(--accent-foreground))",
      },
      popover: {
        DEFAULT: "hsl(var(--popover))",
        foreground: "hsl(var(--popover-foreground))",
      },
      card: {
        DEFAULT: "hsl(var(--card))",
        foreground: "hsl(var(--card-foreground))",
      },
      success: {
        DEFAULT: "hsl(var(--success))",
        foreground: "hsl(var(--success-foreground))",
      },
      warning: {
        DEFAULT: "hsl(var(--warning))",
        foreground: "hsl(var(--warning-foreground))",
      },
      info: {
        DEFAULT: "hsl(var(--info))",
        foreground: "hsl(var(--info-foreground))",
      },
      purple: {
        DEFAULT: "hsl(var(--purple))",
        foreground: "hsl(var(--purple-foreground))",
      },
      orange: {
        DEFAULT: "hsl(var(--orange))",
        foreground: "hsl(var(--orange-foreground))",
      },
      aqua: {
        DEFAULT: "hsl(var(--aqua))",
        foreground: "hsl(var(--aqua-foreground))",
      },
    },
    borderRadius: {
      lg: `var(--radius)`,
      md: `calc(var(--radius) - 2px)`,
      sm: "calc(var(--radius) - 4px)",
    },
    borderColor: {
      DEFAULT: "hsl(var(--border))",
    },
    keyframes: {
      "accordion-down": {
        from: { height: "0" },
        to: { height: "var(--radix-accordion-content-height)" },
      },
      "accordion-up": {
        from: { height: "var(--radix-accordion-content-height)" },
        to: { height: "0" },
      },
    },
    animation: {
      "accordion-down": "accordion-down 0.2s ease-out",
      "accordion-up": "accordion-up 0.2s ease-out",
    },
  };
}

const getChaiBuilderTailwindConfig = ({ content, theme }: { content: string[]; theme?: Record<string, unknown> }) => {
  return {
    darkMode: "class",
    content: [...content],
    theme: {
      extend: {
        ...shadcnTheme(),
        ...(theme ?? {}),
      },
    },
    plugins: [tailwindTypography, tailwindForms, tailwindContainerQueries],
  };
};

export { getChaiBuilderTailwindConfig, shadcnTheme };
