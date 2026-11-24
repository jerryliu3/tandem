import type { Bracket } from './brackets'

export interface TaxTables {
  year: number
  /** True when the year's values are projected by inflation rather than published. */
  projected: boolean
  federal: {
    brackets: Bracket[]
    standardDeduction: number
    ltcg0Max: number
    ltcg15Max: number
    saltCap: number
    saltPhaseStart: number
    saltFloor: number
  }
  fica: {
    ssWageBase: number
    ssRate: number
    medicareRate: number
    addlMedicareRate: number
    addlMedicareThreshold: number
    niitRate: number
    niitThreshold: number
  }
  limits: {
    k401: number
    k401CatchUp50: number
    k401CatchUp6063: number
    dc415c: number
    ira: number
    iraCatchUp: number
    rothPhaseStart: number
    rothPhaseEnd: number
    tradIraPhaseStart: number
    tradIraPhaseEnd: number
    hsaSelf: number
    hsaFamily: number
    hsaCatchUp: number
  }
  ny: { brackets: Bracket[]; standardDeduction: number }
  nyc: { brackets: Bracket[] }
  nyPayroll: { pflRate: number; pflMax: number; sdiRate: number; sdiMax: number }
  canada: { brackets: Bracket[]; nonResidentSurtax: number; partXIIIRate: number }
}

const INF = Number.POSITIVE_INFINITY

const NYC_BRACKETS: Bracket[] = [
  { upTo: 12000, rate: 0.03078 },
  { upTo: 25000, rate: 0.03762 },
  { upTo: 50000, rate: 0.03819 },
  { upTo: INF, rate: 0.03876 },
]

function nyBrackets(low: [number, number, number, number, number]): Bracket[] {
  return [
    { upTo: 8500, rate: low[0] },
    { upTo: 11700, rate: low[1] },
    { upTo: 13900, rate: low[2] },
    { upTo: 80650, rate: low[3] },
    { upTo: 215400, rate: low[4] },
    { upTo: 1077550, rate: 0.0685 },
    { upTo: 5000000, rate: 0.0965 },
    { upTo: 25000000, rate: 0.103 },
    { upTo: INF, rate: 0.109 },
  ]
}

const FICA_BASE = {
  ssRate: 0.062,
  medicareRate: 0.0145,
  addlMedicareRate: 0.009,
  addlMedicareThreshold: 200000,
  niitRate: 0.038,
  niitThreshold: 200000,
}

/** Sources: IRS Rev. Proc. 2025-32, Notice 2025-67, Rev. Proc. 2025-19; SSA; NY IT-2105-I (2026); NY DFS; CRA. */
const TABLES_2026: TaxTables = {
  year: 2026,
  projected: false,
  federal: {
    brackets: [
      { upTo: 12400, rate: 0.1 },
      { upTo: 50400, rate: 0.12 },
      { upTo: 105700, rate: 0.22 },
      { upTo: 201775, rate: 0.24 },
      { upTo: 256225, rate: 0.32 },
      { upTo: 640600, rate: 0.35 },
      { upTo: INF, rate: 0.37 },
    ],
    standardDeduction: 16100,
    ltcg0Max: 49450,
    ltcg15Max: 545500,
    saltCap: 40400,
    saltPhaseStart: 505000,
    saltFloor: 10000,
  },
  fica: { ...FICA_BASE, ssWageBase: 184500 },
  limits: {
    k401: 24500,
    k401CatchUp50: 8000,
    k401CatchUp6063: 11250,
    dc415c: 72000,
    ira: 7500,
    iraCatchUp: 1100,
    rothPhaseStart: 153000,
    rothPhaseEnd: 168000,
    tradIraPhaseStart: 81000,
    tradIraPhaseEnd: 91000,
    hsaSelf: 4400,
    hsaFamily: 8750,
    hsaCatchUp: 1000,
  },
  ny: { brackets: nyBrackets([0.039, 0.044, 0.0515, 0.054, 0.059]), standardDeduction: 8000 },
  nyc: { brackets: NYC_BRACKETS },
  nyPayroll: { pflRate: 0.00432, pflMax: 411.91, sdiRate: 0.005, sdiMax: 31.2 },
  canada: {
    brackets: [
      { upTo: 58523, rate: 0.14 },
      { upTo: 117045, rate: 0.205 },
      { upTo: 181440, rate: 0.26 },
      { upTo: 258482, rate: 0.29 },
      { upTo: INF, rate: 0.33 },
    ],
    nonResidentSurtax: 0.48,
    partXIIIRate: 0.25,
  },
}

/** Sources: IRS Rev. Proc. 2026-35, Notice 2026-66, Rev. Proc. 2026-24; SSA; NY Ch. 59 L.2025; NY DFS; CRA T4127 (Jan 2027). */
const TABLES_2027: TaxTables = {
  year: 2027,
  projected: false,
  federal: {
    brackets: [
      { upTo: 12800, rate: 0.1 },
      { upTo: 52025, rate: 0.12 },
      { upTo: 109125, rate: 0.22 },
      { upTo: 208325, rate: 0.24 },
      { upTo: 264550, rate: 0.32 },
      { upTo: 661375, rate: 0.35 },
      { upTo: INF, rate: 0.37 },
    ],
    standardDeduction: 16600,
    ltcg0Max: 51050,
    ltcg15Max: 563200,
    saltCap: 40804,
    saltPhaseStart: 510050,
    saltFloor: 10000,
  },
  fica: { ...FICA_BASE, ssWageBase: 192300 },
  limits: {
    k401: 25500,
    k401CatchUp50: 8500,
    k401CatchUp6063: 11750,
    dc415c: 75000,
    ira: 7500,
    iraCatchUp: 1100,
    rothPhaseStart: 158000,
    rothPhaseEnd: 173000,
    tradIraPhaseStart: 83000,
    tradIraPhaseEnd: 93000,
    hsaSelf: 4500,
    hsaFamily: 9000,
    hsaCatchUp: 1000,
  },
  ny: { brackets: nyBrackets([0.038, 0.043, 0.0505, 0.053, 0.058]), standardDeduction: 8000 },
  nyc: { brackets: NYC_BRACKETS },
  nyPayroll: { pflRate: 0.00452, pflMax: 451.81, sdiRate: 0.005, sdiMax: 31.2 },
  canada: {
    brackets: [
      { upTo: 60044, rate: 0.14 },
      { upTo: 120088, rate: 0.205 },
      { upTo: 186157, rate: 0.26 },
      { upTo: 265203, rate: 0.29 },
      { upTo: INF, rate: 0.33 },
    ],
    nonResidentSurtax: 0.48,
    partXIIIRate: 0.25,
  },
}

const floorTo = (x: number, step: number) => Math.floor(x / step) * step
const nearestTo = (x: number, step: number) => Math.round(x / step) * step

function indexBrackets(brackets: Bracket[], factor: number, round: (x: number) => number): Bracket[] {
  return brackets.map((b) => ({ rate: b.rate, upTo: Number.isFinite(b.upTo) ? round(b.upTo * factor) : b.upTo }))
}

/** SALT cap per IRC §164(b)(7): 2027 values ×1.01 per year through 2029, then $10,000 with no phase-down. */
function saltFor(year: number): { saltCap: number; saltPhaseStart: number } {
  if (year >= 2030) return { saltCap: 10000, saltPhaseStart: INF }
  const steps = year - 2027
  return {
    saltCap: Math.round(40804 * 1.01 ** steps * 100) / 100,
    saltPhaseStart: Math.round(510050 * 1.01 ** steps * 100) / 100,
  }
}

/**
 * Tax tables for a year. 2026 and 2027 are published values. Later years index federal amounts,
 * contribution limits, the SS wage base and Canadian brackets by `inflationPct` (IRS rounding
 * conventions); NY/NYC brackets are statutorily unindexed and stay at 2027 values.
 */
export function getTables(year: number, inflationPct: number): TaxTables {
  if (year <= 2026) return TABLES_2026
  if (year === 2027) return TABLES_2027

  const f = (1 + inflationPct / 100) ** (year - 2027)
  const b = TABLES_2027
  return {
    year,
    projected: true,
    federal: {
      brackets: indexBrackets(b.federal.brackets, f, (x) => floorTo(x, 25)),
      standardDeduction: floorTo(b.federal.standardDeduction * f, 50),
      ltcg0Max: floorTo(b.federal.ltcg0Max * f, 50),
      ltcg15Max: floorTo(b.federal.ltcg15Max * f, 50),
      saltFloor: 10000,
      ...saltFor(year),
    },
    fica: { ...b.fica, ssWageBase: nearestTo(b.fica.ssWageBase * f, 300) },
    limits: {
      k401: floorTo(b.limits.k401 * f, 500),
      k401CatchUp50: floorTo(b.limits.k401CatchUp50 * f, 500),
      k401CatchUp6063: floorTo(b.limits.k401CatchUp6063 * f, 250),
      dc415c: floorTo(b.limits.dc415c * f, 1000),
      ira: floorTo(b.limits.ira * f, 500),
      iraCatchUp: floorTo(b.limits.iraCatchUp * f, 100),
      rothPhaseStart: floorTo(b.limits.rothPhaseStart * f, 1000),
      rothPhaseEnd: floorTo(b.limits.rothPhaseEnd * f, 1000),
      tradIraPhaseStart: floorTo(b.limits.tradIraPhaseStart * f, 1000),
      tradIraPhaseEnd: floorTo(b.limits.tradIraPhaseEnd * f, 1000),
      hsaSelf: floorTo(b.limits.hsaSelf * f, 50),
      hsaFamily: floorTo(b.limits.hsaFamily * f, 50),
      hsaCatchUp: b.limits.hsaCatchUp,
    },
    ny: b.ny,
    nyc: b.nyc,
    nyPayroll: b.nyPayroll,
    canada: { ...b.canada, brackets: indexBrackets(b.canada.brackets, f, Math.round) },
  }
}
