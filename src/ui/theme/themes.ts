import type { ThemeId } from '../../model/types'

export interface ThemeMeta {
  id: ThemeId
  name: string
  description: string
  swatch: [string, string, string]
}

export const THEMES: ThemeMeta[] = [
  { id: 'midnight', name: 'Midnight', description: 'Indigo and teal on deep navy', swatch: ['#070b18', '#8b96ff', '#4fd1c5'] },
  { id: 'aurora', name: 'Aurora', description: 'Emerald and cyan northern lights', swatch: ['#03110f', '#34d399', '#22d3ee'] },
  { id: 'dusk', name: 'Dusk', description: 'Rose and amber evening glow', swatch: ['#140a14', '#f472b6', '#fb923c'] },
  { id: 'daylight', name: 'Daylight', description: 'Soft lavender and peach', swatch: ['#f4f2fb', '#5b5bd6', '#0d9488'] },
]

export const CHART_VARS = Array.from({ length: 8 }, (_, i) => `var(--chart-${i + 1})`)
export const chartColor = (i: number) => CHART_VARS[i % CHART_VARS.length]
