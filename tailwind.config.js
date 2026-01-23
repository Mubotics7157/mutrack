/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core colors inspired by reference
        "void-black": "#000000",
        "dark-bg": "rgba(15, 15, 15, 0.98)",
        "darker-bg": "rgba(10, 10, 10, 0.98)",

        // Accent colors
        "accent-purple": "#883aea",
        "accent-purple-dim": "rgba(136, 58, 234, 0.3)",
        "sunset-orange": "#f97316",
        "sunset-orange-dim": "rgba(249, 115, 22, 0.3)",
        "accent-green": "#52e3a4",
        "error-red": "#f76464",

        // Text colors
        "text-primary": "rgba(255, 255, 255, 1)",
        "text-secondary": "rgba(255, 255, 255, 0.8)",
        "text-muted": "rgba(255, 255, 255, 0.6)",
        "text-dim": "rgba(255, 255, 255, 0.4)",

        // Glass effects
        glass: "rgba(255, 255, 255, 0.03)",
        "glass-hover": "rgba(255, 255, 255, 0.05)",
        "border-glass": "rgba(255, 255, 255, 0.08)",
        "border-glass-hover": "rgba(255, 255, 255, 0.15)",

        // Role colors (semantic naming)
        "role-admin": "#dc2626",
        "role-lead": "#eab308",
        "role-member": "#3b82f6",

        // Surface hierarchy
        "surface-0": "#000000",
        "surface-1": "rgba(15, 15, 15, 0.98)",
        "surface-2": "rgba(255, 255, 255, 0.03)",
        "surface-3": "rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-orange-purple": "linear-gradient(135deg, #f97316, #883aea)",
        "gradient-orange-red": "linear-gradient(135deg, #f97316, #ef4444)",
        "gradient-text": "linear-gradient(90deg, #f97316, #883aea)",
      },
      spacing: {
        section: "2rem",
        container: "1rem",
        // Standardized spacing scale
        xs: "0.25rem",  // 4px
        sm: "0.5rem",   // 8px
        md: "0.75rem",  // 12px
        lg: "1rem",     // 16px
        xl: "1.5rem",   // 24px
        "2xl": "2rem",  // 32px
        "3xl": "3rem",  // 48px
      },
      fontSize: {
        // Typography scale
        "heading-lg": ["1.5rem", { lineHeight: "1.33" }],
        "heading-md": ["1.25rem", { lineHeight: "1.4" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.5" }],
        "body-lg": ["1rem", { lineHeight: "1.5" }],
        "body-md": ["0.875rem", { lineHeight: "1.5" }],
        "body-sm": ["0.75rem", { lineHeight: "1.5" }],
        label: ["0.75rem", { lineHeight: "1.33", letterSpacing: "0.05em" }],
      },
      borderRadius: {
        container: "0.75rem",
      },
      backdropBlur: {
        xs: "2px",
        md: "10px",
        xl: "24px",
        "2xl": "40px",
      },
      animation: {
        "pulse-slow": "pulse 8s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        "fade-in": "fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in-scale":
          "fadeInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-in": "slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(136, 58, 234, 0.3)" },
          "100%": { boxShadow: "0 0 30px rgba(136, 58, 234, 0.5)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInScale: {
          "0%": { opacity: "0", transform: "scale(0.9) translateY(20px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
