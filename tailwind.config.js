/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Background hierarchy (softer, warmer blacks)
        "bg-primary": "#09090b",
        "bg-secondary": "#0f0f12",
        "bg-tertiary": "#18181b",
        "bg-elevated": "#1f1f23",
        "bg-hover": "#27272a",

        // Legacy support (mapped to new)
        "void-black": "#09090b",
        "dark-bg": "#0f0f12",

        // Primary accent (purple)
        accent: "#8b5cf6",
        "accent-dim": "rgba(139, 92, 246, 0.15)",
        "accent-muted": "rgba(139, 92, 246, 0.3)",

        // Secondary accent (orange)
        "accent-orange": "#f97316",
        "accent-orange-dim": "rgba(249, 115, 22, 0.15)",
        "accent-orange-muted": "rgba(249, 115, 22, 0.3)",

        // Legacy support
        "accent-purple": "#8b5cf6",
        "sunset-orange": "#f97316",

        // Semantic colors
        "accent-success": "#22c55e",
        "success-dim": "rgba(34, 197, 94, 0.15)",
        "accent-warning": "#eab308",
        "warning-dim": "rgba(234, 179, 8, 0.15)",
        "accent-error": "#ef4444",
        "error-dim": "rgba(239, 68, 68, 0.15)",
        "accent-info": "#3b82f6",
        "info-dim": "rgba(59, 130, 246, 0.15)",

        // Legacy
        "accent-green": "#22c55e",
        "error-red": "#ef4444",

        // Text hierarchy (WCAG AA compliant)
        "text-primary": "#fafafa",
        "text-secondary": "#a1a1aa",
        "text-muted": "#71717a",
        "text-dim": "#52525b",

        // Border colors
        border: "#27272a",
        "border-subtle": "#1f1f23",
        "border-focus": "#8b5cf6",

        // Legacy glass effects (simplified)
        glass: "rgba(255, 255, 255, 0.03)",
        "glass-hover": "rgba(255, 255, 255, 0.06)",
        "border-glass": "#27272a",
        "border-glass-hover": "#3f3f46",

        // Role colors
        "role-admin": "#ef4444",
        "role-lead": "#eab308",
        "role-member": "#3b82f6",

        // Surface hierarchy (cards, modals)
        "surface-0": "#09090b",
        "surface-1": "#0f0f12",
        "surface-2": "#18181b",
        "surface-3": "#1f1f23",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-accent": "linear-gradient(135deg, #8b5cf6, #f97316)",
        "gradient-accent-reverse": "linear-gradient(135deg, #f97316, #8b5cf6)",
        "gradient-subtle": "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(249, 115, 22, 0.1))",
        // Legacy
        "gradient-orange-purple": "linear-gradient(135deg, #f97316, #8b5cf6)",
        "gradient-orange-red": "linear-gradient(135deg, #f97316, #ef4444)",
        "gradient-text": "linear-gradient(90deg, #f97316, #8b5cf6)",
      },
      spacing: {
        // Touch-friendly spacing
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-top": "env(safe-area-inset-top)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
        // Section spacing
        section: "2rem",
        container: "1rem",
        // Named scale
        xs: "0.25rem",   // 4px
        sm: "0.5rem",    // 8px
        md: "0.75rem",   // 12px
        lg: "1rem",      // 16px
        xl: "1.5rem",    // 24px
        "2xl": "2rem",   // 32px
        "3xl": "3rem",   // 48px
      },
      fontSize: {
        // Display (hero sections)
        display: ["2rem", { lineHeight: "1.2", fontWeight: "300" }],

        // Headings
        h1: ["1.5rem", { lineHeight: "1.3", fontWeight: "600" }],
        h2: ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
        h3: ["1.125rem", { lineHeight: "1.4", fontWeight: "500" }],

        // Body (mobile-optimized)
        "body-lg": ["1rem", { lineHeight: "1.6" }],
        body: ["0.9375rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],

        // UI elements
        label: ["0.8125rem", { lineHeight: "1.4", fontWeight: "500" }],
        caption: ["0.75rem", { lineHeight: "1.4" }],
        overline: ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "600" }],

        // Legacy
        "heading-lg": ["1.5rem", { lineHeight: "1.33" }],
        "heading-md": ["1.25rem", { lineHeight: "1.4" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.5" }],
        "body-md": ["0.875rem", { lineHeight: "1.5" }],
      },
      borderRadius: {
        none: "0",
        sm: "0.375rem",    // 6px - small elements
        DEFAULT: "0.5rem", // 8px - buttons, inputs
        md: "0.625rem",    // 10px
        lg: "0.75rem",     // 12px - cards
        xl: "1rem",        // 16px - panels
        "2xl": "1.25rem",  // 20px - modals
        "3xl": "1.5rem",   // 24px - large panels
        full: "9999px",    // Pills, avatars
        // Legacy
        container: "0.75rem",
      },
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        DEFAULT: "12px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "40px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.4)",
        DEFAULT: "0 2px 8px rgba(0, 0, 0, 0.4)",
        md: "0 4px 16px rgba(0, 0, 0, 0.4)",
        lg: "0 8px 32px rgba(0, 0, 0, 0.5)",
        xl: "0 16px 48px rgba(0, 0, 0, 0.6)",
        "glow-accent": "0 0 24px rgba(139, 92, 246, 0.25)",
        "glow-orange": "0 0 24px rgba(249, 115, 22, 0.25)",
        "glow-success": "0 0 24px rgba(34, 197, 94, 0.25)",
        inner: "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
        // Legacy
        glow: "0 0 24px rgba(139, 92, 246, 0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "fade-in-up": "fadeInUp 0.4s ease-out forwards",
        "fade-in-scale": "fadeInScale 0.3s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out forwards",
        "slide-down": "slideDown 0.3s ease-out forwards",
        "slide-in-right": "slideInRight 0.3s ease-out forwards",
        pulse: "pulse 2s ease-in-out infinite",
        "pulse-slow": "pulse 4s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        shimmer: "shimmer 2s linear infinite",
        spin: "spin 1s linear infinite",
        // Legacy
        "slide-in": "slideInRight 0.3s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInScale: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 16px rgba(139, 92, 246, 0.2)" },
          "100%": { boxShadow: "0 0 24px rgba(139, 92, 246, 0.4)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
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
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "SF Mono",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
        fast: "100ms",
        normal: "200ms",
        slow: "300ms",
      },
    },
  },
  plugins: [],
};
