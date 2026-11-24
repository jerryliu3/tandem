# Tandem — Couples Financial Planning Dashboard (Design Spec)

Date: 2026-11-23
Status: Approved design (brainstorming), pending implementation plan

## 1. Purpose

Replace Jerry & Sophia's `Finances.numbers` spreadsheet ("2027 Couples Budget USD") with a
beautiful, interactive, local-first React dashboard for **planning** (not tracking) a couple's
finances on a month-by-month basis, with a retirement goal solver.

Non-goals: transaction entry, bank sync, expense tracking, joint tax filing, dated life events,
Social Security benefit modeling, retirement drawdown modeling, auth/multi-user, mobile layouts.

## 2. Source spreadsheet analysis

The sheet (single table, exported via Numbers → xlsx and parsed) models:

| Area | Sheet logic |
| --- | --- |
| Per person (Jerry, Sophia) | Taxable = base·(1+bonus%) − base·pretax%. Post-tax = taxable − fed − state − city + pretax savings. Monthly budget = post-tax/12. Savings % (63%) taken first; True monthly budget = monthly·(1−savings%). Fixed costs = Σ monthly expenses. Avg spending = fixed + yearly/12. Variable = true budget − fixed. |
| Shared | Fixed: internet, dining, groceries 200, utilities 100. Travel = trips·(flight + activities + days·(hotel + dining))·2. Shared budget = Σ individual true budgets; variable = shared budget − shared fixed. |
| Condo (Canada, CAD) | Mortgage 2,500 CAD/mo with fixed 50% principal; interest = 50%. Fees 580/mo, property tax 2,804/yr, rent 2,350/mo. Net condo revenue = rent − tax/12 − fees − interest. Converted at USD→CAD 1.40. Added to Jerry's monthly savings. |
| Net worth | FV(8%, n, −monthly·12, −investments) + condo·(1+appr)^n − (mortgage − paydown·n) + current net worth. 10-year table 2027–2033. |

### Defects found (fixed in Tandem)

1. Sophia's post-tax formula omits federal tax entirely and sums state/city cells computed from
   **Jerry's** income (`E9 = E7 − SUM(O26:O29) − SUM(R26:R30) …`). Effective rate shows 7.48%.
2. No FICA (Social Security / Medicare), no federal or NY standard deduction; federal brackets
   are 2023 values; NY rates pre-2026.
3. Net worth projection adds current net worth twice (`+$L$10`; year 0 = $440k instead of $220k)
   and mixes CAD condo value/mortgage with USD balances.
4. Pre-tax savings are added back into post-tax income and then also counted as 401k in yearly
   savings → double count whenever pretax% > 0.
5. Shared budget ignores individual fixed costs (pooled allowance minus only shared fixed costs).
6. Yearly stock vesting is added to savings untaxed.

Insight surfaced (not a defect): at 63% savings, Jerry's discretionary budget is −$1,470/mo.

## 3. Architecture

- **Stack:** Vite + React 19 + TypeScript, Tailwind CSS v4, Radix UI primitives, Recharts,
  Framer Motion (`motion`), Zustand (+ `zundo` for undo/redo), lucide-react icons, Inter
  variable font, Vitest.
- **Location:** `~/tandem`. Runs with `npm run dev` on localhost.
- **Persistence:** single `Plan` JSON document behind a `PlanRepository` interface
  (`load(): Promise<Plan|null>`, `save(plan): Promise<void>`). v1 implementation:
  `LocalStorageRepository`. Future: `SupabaseRepository` (one `plans` row with a `jsonb` column).
  JSON export/import + reset-to-defaults. Plan carries `schemaVersion` with a `migrate()` hook.
- **Layers:**
  - `src/engine/` — pure TypeScript, no React. `computePlan(plan) → PlanResult` and
    `projectPlan(plan) → Projection`. Nothing derived is persisted.
  - `src/model/` — types, defaults (seeded from the sheet), schema/migrations.
  - `src/store/` — Zustand store, repository, undo/redo.
  - `src/ui/` — app shell, pages, components, charts, themes.

## 4. Data model (abridged)

```ts
type Currency = 'USD' | 'CAD';
type Money = { amount: number; currency: Currency };
type Frequency = 'monthly' | 'yearly';

interface Plan {
  schemaVersion: 1;
  settings: { planYear: 2026 | 2027; displayCurrency: Currency; fxCadPerUsd: number; theme: ThemeId };
  people: [Person, Person];          // ids 'jerry' | 'sophia'
  shared: { expenses: Expense[]; travel: TravelPlan; split: SplitRule };
  properties: RentalProperty[];      // Canadian condo
  accounts: Account[];
  debts: Debt[];
  assumptions: Assumptions;
  goal: RetirementGoal;
}

interface Person {
  id: PersonId; name: string; birthYear: number;
  income: { baseSalary: number; bonusPct: number; bonusToSavings: boolean;
            rsuAnnualVest: number; esppContribPct: number; esppDiscountPct: number;
            otherTaxableIncome: number };
  payroll: { k401TraditionalPct: number; k401RothPct: number; k401AfterTaxPct: number;
             matchPct: number; matchUpToPct: number;           // e.g. 100% up to 4%
             hsaAnnual: number; hsaEmployerAnnual: number; hsaCoverage: 'self' | 'family';
             preTaxPremiumsMonthly: number };
  ira: { annualContribution: number; kind: 'roth' | 'traditional' };  // auto backdoor detection
  savingsRatePct: number;            // % of monthly take-home saved first (sheet: 63%)
  savingsAllocation: { accountId: string; pct: number }[];  // remainder after IRA
  expenses: Expense[];
}

interface Expense { id: string; name: string; category: CategoryId; amount: number;
                    currency: Currency; frequency: Frequency }
interface TravelPlan { trips: number; daysPerTrip: number; travelers: number;
                       flightPerPerson: number; hotelPerNightPerPerson: number;
                       activitiesPerTripPerPerson: number; diningPerDayPerPerson: number }
type SplitRule = { kind: 'even' } | { kind: 'income' } | { kind: 'custom'; jerryPct: number };

interface RentalProperty {
  id: string; name: string; ownerId: PersonId; ownershipPct: number; currency: 'CAD';
  marketValue: number; appreciationPct: number;
  mortgage: { balance: number; annualRatePct: number; monthlyPayment: number;
              compounding: 'semi-annual' | 'monthly' };
  monthlyRent: number; vacancyPct: number; condoFeesMonthly: number; propertyTaxAnnual: number;
  insuranceAnnual: number; managementPct: number; maintenanceAnnual: number;
  canada: { nr6Elected: boolean };
  us: { purchasePrice: number; purchaseYear: number; landPct: number; fxAtPurchase: number };
}

type AccountType = 'k401_traditional' | 'k401_roth' | 'ira_traditional' | 'ira_roth' | 'hsa'
  | 'brokerage' | 'cash' | 'rrsp' | 'tfsa' | 'fhsa';
interface Account { id: string; name: string; type: AccountType; ownerId: PersonId | 'joint';
                    balance: number; currency: Currency; expectedReturnPct?: number;
                    annualContribution?: number /* RRSP/TFSA/FHSA only */ }

interface Debt { id: string; name: string; ownerId: PersonId; balance: number | null;
                 annualRatePct: number; monthlyPayment: number; currency: Currency }

interface Assumptions { stockReturnPct: number; cashYieldPct: number; inflationPct: number;
  salaryGrowthPct: number; dividendYieldPct: number; returnVolatilityPct: number }

interface RetirementGoal {
  scope: 'household' | PersonId;
  target: { mode: 'amount'; amount: number; dollars: 'today' | 'future' }
        | { mode: 'spending'; annualSpendingToday: number; withdrawalRatePct: number };
  by: { mode: 'date'; year: number; month: number } | { mode: 'age'; personId: PersonId; age: number };
  includeRealEstateEquity: boolean;
}
```

### Defaults (seeded from the sheet)

- Plan year 2027, FX 1.40 CAD per USD, display USD, theme Midnight.
- Jerry & Sophia: base $100,000, bonus 15%, pre-tax 0%, savings 63%, birth year placeholder.
- Jerry expenses (monthly): Rent 3,250; Internet 50; Gym 90; Phone 35; Transit 120; Utilities 80;
  Dining 200; Entertainment 0. Yearly: Gifts 2,500. Debt: Student loan 300 CAD/mo (balance unknown → ongoing).
- Sophia expenses (monthly): Rent 0; Gym 0; Phone 35; Transit 120; Utilities 80; Misc 0; Entertainment 0. Yearly: Gifts 0.
- Shared monthly: Internet 0; Dining out 0; Groceries 200; Utilities 100. Split even.
- Travel: 2 trips × 9 days, 2 travelers, flight 600, hotel 125/night/person, activities 500/trip/person,
  dining 125/day/person (sheet total $13,400/yr).
- Condo (Jerry 100%, CAD): value 500,000; mortgage 280,000 @ 5.42% semi-annual (rate chosen so
  month-1 interest ≈ the sheet's 50% split), payment 2,500/mo; rent 2,350/mo; fees 580/mo; property tax
  2,804/yr; appreciation 0%; NR6 elected; US basis placeholders (flagged "needs input").
- Accounts: zero balances (sheet investments = 0); 401k/Roth IRA/brokerage/cash per person.
- Assumptions: stocks 8% (sheet), cash 3.5%, inflation 2.5%, salary growth 3%, dividend yield 1.5%, volatility 15%.
- Goal: household, $2,500,000 in today's dollars by Jan 2055 (placeholder, flagged).

Fields that are unknown placeholders render a subtle "needs input" badge and produce an insight.

## 5. Calculation engine

All money is computed in USD internally; CAD inputs convert at `fxCadPerUsd` (USD = CAD / fx).
The display layer converts to the chosen display currency.

### 5.1 Tax tables (`src/engine/tax/tables.ts`), single filer

| Item | 2026 | 2027 | Source |
| --- | --- | --- | --- |
| Federal brackets (upper bounds) | 12,400 / 50,400 / 105,700 / 201,775 / 256,225 / 640,600 | 12,800 / 52,025 / 109,125 / 208,325 / 264,550 / 661,375 | Rev. Proc. 2025-32; 2026-35 |
| Federal rates | 10/12/22/24/32/35/37% | same | — |
| Standard deduction | 16,100 | 16,600 | same |
| LTCG 0% / 15% max | 49,450 / 545,500 | 51,050 / 563,200 | same |
| SALT cap / phase-down start | 40,400 / 505,000 | 40,804 / 510,050 | IRC §164(b)(7) (30% phase-down, $10k floor; reverts to $10k in 2030) |
| Social Security wage base | 184,500 | 192,300 | SSA |
| Additional Medicare threshold | 200,000 | 200,000 | statute |
| NIIT threshold | 200,000 | 200,000 | statute |
| 401(k) deferral / catch-up 50+ / 60–63 | 24,500 / 8,000 / 11,250 | 25,500 / 8,500 / 11,750 | Notice 2026-66 |
| 415(c) total DC limit | 72,000 | 75,000 | same |
| IRA / catch-up | 7,500 / 1,100 | 7,500 / 1,100 | same |
| Roth IRA phase-out (single) | 153,000–168,000 | 158,000–173,000 | same |
| Trad IRA deduction phase-out (covered) | 81,000–91,000 | 83,000–93,000 | same |
| HSA self / family / catch-up 55+ | 4,400 / 8,750 / 1,000 | 4,500 / 9,000 / 1,000 | Rev. Proc. 2026-24 |
| NY brackets (single, not indexed) | 8,500 / 11,700 / 13,900 / 80,650 / 215,400 / 1,077,550 / 5M / 25M | same | NYS Tax Law §601 |
| NY rates | 3.9 / 4.4 / 5.15 / 5.4 / 5.9 / 6.85 / 9.65 / 10.3 / 10.9% | 3.8 / 4.3 / 5.05 / 5.3 / 5.8 / 6.85 / 9.65 / 10.3 / 10.9% | IT-2105-I (2026); Ch. 59 L.2025 |
| NY standard deduction | 8,000 | 8,000 | IT-2105-I |
| NYC brackets / rates | 12,000 / 25,000 / 50,000; 3.078 / 3.762 / 3.819 / 3.876% | same | IT-2105-I |
| NYC school tax credit | fixed $63 (FAGI ≤ 250k); rate-reduction 0.171% to 12k, then $21 + 0.228% (city TI ≤ 500k) | same | IT-2105-I |
| NY PFL employee | 0.432%, max 411.91 | 0.452%, max 451.81 | NY DFS |
| NY SDI employee | 0.5%, max 31.20 | same | NY WCB |
| Canada federal brackets | 58,523 / 117,045 / 181,440 / 258,482 | 60,044 / 120,088 / 186,157 / 265,203 | CRA; T4127 (Jan 2027) |
| Canada federal rates | 14 / 20.5 / 26 / 29 / 33% | same | — |
| Non-resident surtax | 48% of federal tax | same | ITA §120(1) |
| Part XIII withholding on gross rent | 25% | 25% | ITA §212 |

Projection years after 2027: federal brackets, standard deduction, LTCG thresholds, contribution
limits, SS wage base and Canadian brackets are indexed by `inflationPct` from the 2027 values.
NY/NYC brackets stay fixed (statutorily unindexed). SALT cap follows the statute (+1%/yr to 2029,
$10k from 2030). PFL/SDI held at 2027 values.

### 5.2 Paycheck (`payroll.ts`, per person, per year)

1. Cash comp = base + bonus. Gross wages = cash comp + RSU vest + ESPP discount income.
2. 401(k): employee traditional/Roth = pct × base (bonus deferral excluded for simplicity),
   combined capped at the 402(g) limit (+ catch-up by age), traditional first. After-tax 401(k)
   capped so employee + match + after-tax ≤ 415(c). Match = matchPct × min(employee%, upTo%) × base.
3. HSA via payroll capped at coverage limit (+55 catch-up) minus employer HSA.
4. Federal wages = gross − traditional 401(k) − HSA − pre-tax premiums.
   FICA wages = gross − HSA − pre-tax premiums.
5. AGI = federal wages + other income + rental Schedule E amount (net income, or allowed passive
   loss — §5.4) − deductible traditional IRA (phase-out rules; usually 0 at their income).
6. NY AGI = AGI. NY taxable = NYAGI − 8,000. NY tax = schedule, or the tax-benefit recapture
   when NYAGI > 107,650 (§5.3). NYC taxable = NY taxable; NYC tax by schedule.
   NY credits: NYC school tax credit (fixed + rate-reduction).
7. Federal taxable = AGI − max(standard, min(NY tax + NYC tax, SALT cap after phase-down)).
   Federal tax = schedule − foreign tax credit (§5.4). + Additional Medicare 0.9% over 200k wages.
   + NIIT 3.8% × min(NII, MAGI − 200k) when applicable.
8. Payroll: SS 6.2% × min(FICA wages, wage base); Medicare 1.45% × FICA wages; PFL; SDI.
9. Total tax; effective rate = total tax / gross income; combined marginal rate computed by
   re-running with +$1,000 of wages.
10. Incremental attribution, layered in order wages → RSU → rental:
    `wageTax = tax(wages)`, `rsuTax = tax(wages + RSU) − wageTax`,
    `rentalTax = tax(all) − tax(wages + RSU)` (may be negative when depreciation creates an
    allowed loss). Net RSU value (vest − rsuTax) flows to brokerage; it is not cash take-home.
    `rentalTax` is charged to the property's cash flow (§5.4).
11. Cash take-home (annual) = cash comp − wageTax − employee 401(k) (all types) − HSA
    − pre-tax premiums − ESPP contributions. Monthly take-home = annual / 12.
    If `bonusToSavings`, the after-tax bonus (computed incrementally) goes to savings instead of
    the monthly budget.

### 5.3 NY tax-benefit recapture (single)

Let `sched(x)` be the NY rate schedule tax, `L` bracket lower bounds, `r` rates, `n(x) =
round4(x / 50,000)`.

- NYAGI ≤ 107,650 → `sched(TI)`.
- NYAGI > 25,000,000 → `TI × top rate`.
- TI ≤ 215,400 → flat = `TI × r(80,650 bracket)` (5.90% in 2026, 5.80% in 2027). If NYAGI ≥ 157,650
  → flat; else `sched + (flat − sched) × n(NYAGI − 107,650)`.
- TI in a bracket k with lower bound L_k ∈ {215,400; 1,077,550; 5,000,000}:
  `sched(TI) + base_k + incr_k × n(min(NYAGI − L_k, 50,000))`, where
  `base_first = round(r_prev × L − sched(L))`, `incr_k = round(r_k × L_k − sched(L_k) − base_k)`,
  `base_{k+1} = base_k + incr_k`. This reproduces the official 2026 constants
  (567 / 2,047; 2,614 / 30,172; 32,786 / 32,500) and derives 2027 automatically.

### 5.4 Canadian rental condo (`rental.ts`, CAD → USD)

- **Mortgage:** monthly rate `i = (1 + r/2)^(1/6) − 1` for semi-annual compounding (else r/12).
  Amortize monthly: interest = balance × i, principal = payment − interest. Projection runs the
  schedule until paid off.
- **Operating:** effective rent = rent × 12 × (1 − vacancy). Expenses = fees + property tax +
  insurance + management% × effective rent + maintenance. Interest from schedule.
- **Canada:** Part XIII = 25% × gross rent (no NR6). With NR6/§216: net = rent − expenses −
  interest (no CCA), tax = federal schedule(net) × 1.48 (no personal credits). Show both and savings.
- **US Schedule E:** depreciation = (purchasePrice × (1 − landPct)) / fxAtPurchase / 30 (ADS for
  foreign residential rental, straight-line; mid-month convention in placed-in-service year).
  Net = (rent − expenses − interest) in USD − depreciation.
  If net < 0: passive loss allowance = max(0, 25,000 − 50% × max(0, MAGI − 100,000)), where MAGI is
  AGI computed without the rental loss and without IRA deductions; allowed loss
  = min(|net|, allowance); remainder reported as suspended (not carried forward in v1).
  If net > 0: included in AGI; foreign tax credit = min(Canadian tax USD, federal tax ×
  foreign income / taxable income). NY/NYC give no credit for Canadian federal tax.
- **Outputs:** monthly cash flow = (rent − expenses − mortgage payment − Canadian tax −
  rentalTax) / 12, with `rentalTax` from §5.2 step 10; equity build = principal;
  economic return. Cash flow goes into the owner's monthly savings pool (negative reduces it).

### 5.5 Canadian accounts (US resident)

- RRSP: tax-deferred (US–Canada treaty, Rev. Proc. 2014-55); grows at expected return; pre-tax bucket.
- TFSA / FHSA: not recognized by US — growth taxed annually; modeled as taxable with tax drag.
- Contributions to TFSA/FHSA while non-resident trigger an insight warning (1%/month penalty /
  eligibility); RRSP contributions warn that deduction value may be nil.

### 5.6 Budgets (`budget.ts`)

Per person (monthly, USD):
- Take-home → savings (savingsRatePct × take-home) → spending allowance.
- Fixed = personal monthly expenses + debt payments + share of shared monthly expenses.
- Yearly = personal yearly expenses + share of travel + shared yearly, ÷ 12.
- Discretionary = allowance − fixed − yearly/12.
Household ("Together"): sums of both persons; shared costs counted once.
Split: even, income-proportional (by take-home), or custom.
Travel = trips × travelers × (flight + activities + days × (hotel + dining)).

### 5.7 Savings flows (`savings.ts`)

Per person per year: employee 401(k) by type + match → 401(k) accounts; after-tax 401(k) → Roth
401(k) (mega backdoor); HSA employee + employer → HSA; net RSU + ESPP shares → brokerage;
take-home savings → IRA first (annualContribution, capped by limit; flagged "backdoor" when MAGI
exceeds the Roth phase-out start; pro-rata warning if traditional IRA balance > 0), remainder split by
`savingsAllocation`; rental cash flow → owner's pool. True savings rate = total saved / gross income.

### 5.8 Projection (`projection.ts`)

Monthly steps from Jan of `planYear` to the goal date (min 10 years for charts), aggregated per year.
Each year: salaries × (1 + salaryGrowth), expenses × (1 + inflation), tax tables indexed (§5.1),
full paycheck/rental/savings recomputed, contributions capped at that year's limits. Accounts
compound monthly at expected return (stocks for investment accounts, cash yield for cash);
taxable accounts (brokerage, TFSA, FHSA) lose a tax drag = dividendYield × (federal LTCG rate +
NY marginal + NYC marginal); cash interest drag = yield × ordinary marginal. Property value
appreciates annually; mortgage amortizes; debts amortize until paid off (then their payment drops
out of fixed costs). Net worth (USD) = accounts + property equity − debts. Output also in today's
dollars (÷ (1 + inflation)^t).

### 5.9 Goal solver (`goal.ts`)

- Target: amount (today's → nominal via inflation), or spending ÷ withdrawal rate (today's $).
- Counted assets: accounts in scope (+ real-estate equity if enabled).
- Outputs: projected value at target date; on-track % ; **required monthly contribution** from now
  (growing at salary growth) solving `FV = PV·(1+i)^n + PMT·((1+i)^n − (1+g)^n)/(i − g)` (monthly
  i, g; g = i handled as limit); gap vs current planned contributions; implied savings rate % of
  take-home (solved by bisection over the full engine) with one-click apply; coast amount =
  target / (1+i)^n; date the current plan hits the target; required annual return (bisection).
- Glide path: required balance by year (the balance that, with current contributions, reaches the
  target on time), plotted vs projected.
- Bands: expected ± 2% returns. Monte Carlo: 1,000 paths of annual lognormal returns (mean =
  expected, σ = volatility), seeded RNG for stable output; P10/P50/P90 fan + probability of success.

### 5.10 Insights (`insights.ts`)

Engine returns `{ id, severity: 'info'|'warn'|'critical', title, detail, personId? }[]`, e.g.:
negative discretionary budget; Roth IRA direct contribution not allowed → backdoor; 401(k) capped;
unused employer match; NR6 not elected (cost shown); suspended passive loss; TFSA/FHSA non-resident
contribution; placeholder inputs needing data; goal off-track with required change.

## 6. Interface

- **Shell:** slim left sidebar (logo, nav, theme dot); top bar with person switcher
  **Jerry · Sophia · Together** (global, every page respects it), plan year 2026/2027,
  USD/CAD display toggle, undo/redo.
- **Pages:**
  1. Overview — net worth hero + projected at goal date; goal on-track ring; monthly money-flow
     Sankey (income → taxes → savings → fixed → discretionary); KPI cards (take-home/mo, savings
     rate, discretionary left, effective tax rate); net worth projection area chart; insights feed.
  2. Income & Taxes — paycheck waterfall; tax breakdown by component; bracket ladder showing
     where income falls (federal, NY, NYC); "next $1,000" marginal card; Jerry vs Sophia compare;
     inputs for salary, bonus, RSU, ESPP, 401(k), HSA, premiums.
  3. Budget — allowance vs fixed vs discretionary bar; editable expense lists (monthly/yearly,
     CAD/USD per line, category color/icon); category donut; shared expenses with split control;
     travel planner card; debts.
  4. Accounts & Savings — balances grouped by tax treatment (pre-tax/Roth/taxable/Canadian)
     donut; annual contributions per account; limit progress bars; IRA/backdoor & match notes;
     savings allocation editor.
  5. Property — condo monthly cash-flow breakdown; Part XIII vs NR6 comparison; US Schedule E
     summary; amortization/equity chart; value & equity projection.
  6. Retirement Goal — goal setup; on-track gauge; glide path vs projection with bands; "To get
     there" card (required monthly, implied savings %, apply button); what-if sliders (savings %,
     return, target date, goal) applied live to the plan with undo; Monte Carlo fan + odds.
  7. Assumptions & Settings — returns, inflation, raises, FX, dividend yield, volatility; theme
     picker; export/import/reset.
- **Editing:** click-to-edit inline numbers (Enter saves, Esc cancels), sliders for percentages,
  currency inputs with CAD/USD pill, slide-over drawers for add/edit, animated number transitions.
- **Explainability:** every derived figure has an ⓘ popover showing its formula and inputs.
- **Visual system:** dark-first; themes Midnight (navy, indigo→violet glow), Aurora (ink,
  teal→emerald), Dusk (plum, rose→amber), Daylight (light, lavender→peach). Translucent cards with
  hairline borders, rounded-2xl, generous spacing, Inter with tabular numerals, vibrant category
  palette, gradient-filled charts with minimal gridlines and custom tooltips. Theme tokens via CSS
  variables. Laptop/desktop first.

## 7. Error handling & validation

- Inputs clamp to valid ranges (non-negative money, 0–100% percents, plausible years).
- Engine never throws on user data; invalid/missing values fall back to 0 and emit an insight.
- Contribution overages are capped and reported.
- Storage load failures fall back to defaults with a toast; import validates schema version.

## 8. Testing

Vitest unit tests:
- Federal: 2026 TI 98,900 → 16,470.00; 2027 TI 98,400 → 16,189.50.
- NY: 2026 TI 107,000 / NYAGI 115,000 → 5,829.05 (sched 5,745.65 + recapture 83.40);
  recapture constants match official 2026 values (567/2,047/2,614/30,172/32,786/32,500).
- NYC: TI 107,000 → 4,022.32; school credits.
- FICA wage-base cap; Additional Medicare; PFL/SDI caps.
- Canada §216 vs Part XIII; mortgage semi-annual amortization; depreciation & passive allowance.
- Goal solver: closed-form PMT round-trips through the projection; coast amount; bisection.
- Sheet parity: travel = 13,400; corrected per-person structure matches hand-computed values.
- Store: persistence round-trip, import/export, undo.
Browser smoke check of every page after build.

## 9. Disclaimers

UI footer: "Planning estimates, not tax advice." Tax figures cite their source year in tooltips.
