/**
 * Design Tokens e Utilitários de Tema (Premium Standard)
 * Este arquivo centraliza tokens de design que não cabem apenas no Tailwind,
 * como configurações de Glassmorphism e Transições complexas.
 */

export const THEME_TOKENS = {
  glass: {
    base: "backdrop-blur-md bg-white/70 border border-white/20 shadow-xl",
    dark: "dark:backdrop-blur-md dark:bg-slate-900/70 dark:border-slate-800/50 dark:shadow-2xl",
    navbar: "backdrop-blur-lg bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-slate-800/50",
  },
  animations: {
    micro: "transition-all duration-200 ease-out",
    smooth: "transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
    bounce: "transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
  shadows: {
    premium: "shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]",
    card: "border border-slate-200/60 dark:border-slate-800/60 shadow-sm hover:shadow-md transition-shadow",
  },
} as const;

export type ThemeTokens = typeof THEME_TOKENS;
