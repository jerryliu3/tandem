import type { Pt } from './kit'

/** One shared day, Thanksgiving 2026, so every direction renders identical data. */
export const day = { long: 'Thursday, November 26', short: 'Thu, Nov 26', occasion: 'Thanksgiving' }

export const body = {
  readiness: 78,
  sleepScore: 84,
  sleep: '7h 12m',
  sleepNeed: '7h 48m',
  bed: '10:58 PM',
  wake: '6:21 AM',
  hrv: 61,
  hrvBase: 55,
  rhr: 52,
  rhrBase: 54,
  resp: 14.2,
  temp: 0.1,
  strain: 11.4,
  strainTarget: [12, 15] as const,
  activeMin: 38,
  range: [25, 45] as const,
  steps: 8240,
  kcal: 2310,
  hrvTrend: [52, 55, 50, 57, 54, 58, 61],
  rhrTrend: [55, 54, 55, 53, 54, 53, 52],
  respTrend: [14.6, 14.4, 14.5, 14.3, 14.4, 14.2, 14.2],
  tempTrend: [0.2, 0.1, -0.1, 0, 0.2, 0.1, 0.1],
  /** Daily active minutes for the last 14 days; today is last. */
  minutes14: [32, 41, 18, 36, 52, 61, 44, 37, 29, 33, 47, 40, 35, 38],
}

export const run = {
  title: 'Turkey Trot 10K',
  time: '7:42 AM',
  place: 'Prospect Park, Brooklyn',
  km: 10.2,
  duration: '50:40',
  pace: '4:58',
  avgHr: 162,
  maxHr: 178,
  elev: 53,
  kcal: 712,
  strain: 9.8,
  pr: { label: '10K', time: '49:45', delta: '−0:13', prev: 'Oct 4' },
  /** Seconds per km. */
  splits: [310, 304, 300, 298, 297, 299, 302, 297, 293, 285],
  zones: [
    { z: 'Z1', pct: 4, min: 2 },
    { z: 'Z2', pct: 14, min: 7 },
    { z: 'Z3', pct: 38, min: 19 },
    { z: 'Z4', pct: 36, min: 18 },
    { z: 'Z5', pct: 8, min: 4 },
  ],
  hr: [
    112, 121, 130, 138, 145, 150, 153, 155, 157, 158, 159, 161, 160, 161, 162, 163, 162, 161, 163, 164, 163, 162, 164, 165,
    163, 162, 164, 165, 166, 164, 165, 166, 167, 165, 166, 167, 168, 167, 168, 169, 170, 169, 171, 172, 171, 173, 175, 177,
    178, 176, 172,
  ],
  route: [
    [0.2, 0.8], [0.15, 0.64], [0.16, 0.47], [0.24, 0.33], [0.36, 0.24], [0.5, 0.2], [0.63, 0.22], [0.74, 0.3],
    [0.8, 0.42], [0.82, 0.55], [0.78, 0.67], [0.68, 0.75], [0.56, 0.77], [0.45, 0.73], [0.36, 0.76], [0.27, 0.83],
    [0.22, 0.82],
  ] as Pt[],
}

export const fmtPace = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

export const TODAY = 3
export const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export type PersonId = 'jerry' | 'sophia' | 'alex' | 'priya' | 'sam'

export type Person = {
  id: PersonId
  name: string
  full: string
  you?: boolean
  week: number[]
  target: number
  strain: number
  recovery: number
  sleep: number
  km: number
  resting?: boolean
}

export const people: Person[] = [
  { id: 'jerry', name: 'Jerry', full: 'Jerry Liu', you: true, week: [1, 0, 1, 1, 0, 0, 0], target: 4, strain: 40.5, recovery: 78, sleep: 84, km: 91.2 },
  { id: 'sophia', name: 'Sophia', full: 'Sophia Chen', week: [1, 1, 0, 1, 0, 0, 0], target: 4, strain: 43.8, recovery: 82, sleep: 88, km: 98.4 },
  { id: 'alex', name: 'Alex', full: 'Alex Rivera', week: [1, 1, 1, 0, 0, 0, 0], target: 5, strain: 47.1, recovery: 61, sleep: 71, km: 72.0 },
  { id: 'priya', name: 'Priya', full: 'Priya Shah', week: [0, 1, 0, 1, 0, 0, 0], target: 3, strain: 29.6, recovery: 74, sleep: 90, km: 54.3 },
  { id: 'sam', name: 'Sam', full: 'Sam Okafor', week: [1, 0, 0, 0, 0, 0, 0], target: 0, strain: 12.2, recovery: 44, sleep: 69, km: 31.0, resting: true },
]

export const person = (id: PersonId) => people.find((p) => p.id === id)!

export const crewWeek = { done: 11, goal: 16, streakWeeks: 23, freezes: 2 }

export const sophiaRun = {
  title: 'Easy miles before the turkey',
  time: '7:10 AM',
  km: 6.2,
  duration: '32:04',
  pace: '5:10',
  kudos: 14,
  comments: 3,
  route: [
    [0.1, 0.7], [0.2, 0.6], [0.3, 0.46], [0.42, 0.38], [0.55, 0.41], [0.66, 0.32], [0.79, 0.27], [0.9, 0.38],
    [0.85, 0.53], [0.7, 0.59], [0.56, 0.63], [0.42, 0.71], [0.27, 0.78], [0.14, 0.75],
  ] as Pt[],
}

export const alexLift = { title: 'Bench day', duration: '52:10', volume: '6,420', sets: 18, pr: 95, when: 'Yesterday · 6:30 PM' }

export const priyaYoga = { title: 'Slow flow', duration: '30 min', time: '8:40 AM' }

export const challenge = { name: 'November Miles', goalKm: 120, daysLeft: 4, stakes: 'Last place cooks Sunday dinner' }
