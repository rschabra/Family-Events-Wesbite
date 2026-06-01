// All Tailwind class strings must be complete literals so the JIT scanner
// can find them. Never construct them dynamically (e.g. `bg-${color}-500`).

export const THEME_NAMES = [
  'indigo', 'rose', 'amber', 'emerald', 'sky', 'violet', 'orange', 'pink',
] as const

export type ThemeName = typeof THEME_NAMES[number]

export interface Theme {
  label: string
  swatch: string       // filled circle shown in the picker
  chip: string         // calendar chip classes
  listBorder: string   // list-view left border
  headerFrom: string   // gradient start class
  headerTo: string     // gradient end class
  pageBg: string       // subtle full-page tint
}

export const THEMES: Record<ThemeName, Theme> = {
  indigo: {
    label: 'Indigo',
    swatch: 'bg-indigo-500',
    chip: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
    listBorder: 'border-l-indigo-400',
    headerFrom: 'from-indigo-500',
    headerTo: 'to-indigo-700',
    pageBg: 'bg-indigo-50/40',
  },
  rose: {
    label: 'Rose',
    swatch: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
    listBorder: 'border-l-rose-400',
    headerFrom: 'from-rose-400',
    headerTo: 'to-rose-600',
    pageBg: 'bg-rose-50/40',
  },
  amber: {
    label: 'Amber',
    swatch: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    listBorder: 'border-l-amber-400',
    headerFrom: 'from-amber-400',
    headerTo: 'to-amber-600',
    pageBg: 'bg-amber-50/40',
  },
  emerald: {
    label: 'Emerald',
    swatch: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    listBorder: 'border-l-emerald-400',
    headerFrom: 'from-emerald-500',
    headerTo: 'to-emerald-700',
    pageBg: 'bg-emerald-50/40',
  },
  sky: {
    label: 'Sky',
    swatch: 'bg-sky-500',
    chip: 'bg-sky-100 text-sky-800 hover:bg-sky-200',
    listBorder: 'border-l-sky-400',
    headerFrom: 'from-sky-400',
    headerTo: 'to-sky-600',
    pageBg: 'bg-sky-50/40',
  },
  violet: {
    label: 'Violet',
    swatch: 'bg-violet-500',
    chip: 'bg-violet-100 text-violet-800 hover:bg-violet-200',
    listBorder: 'border-l-violet-400',
    headerFrom: 'from-violet-500',
    headerTo: 'to-violet-700',
    pageBg: 'bg-violet-50/40',
  },
  orange: {
    label: 'Orange',
    swatch: 'bg-orange-500',
    chip: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    listBorder: 'border-l-orange-400',
    headerFrom: 'from-orange-400',
    headerTo: 'to-orange-600',
    pageBg: 'bg-orange-50/40',
  },
  pink: {
    label: 'Pink',
    swatch: 'bg-pink-500',
    chip: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
    listBorder: 'border-l-pink-400',
    headerFrom: 'from-pink-400',
    headerTo: 'to-pink-600',
    pageBg: 'bg-pink-50/40',
  },
}

export function getTheme(color: string | null | undefined): Theme {
  return THEMES[(color as ThemeName) ?? 'indigo'] ?? THEMES.indigo
}
