# Tandem — Simplify around the monthly check-in (Design Spec)

Date: 2026-11-24 · Branch: `simplify` · Previous version: tag `v1-full-dashboard`

## 1. Goal

The seven-tab dashboard is too much to manage. In a normal month Jerry and Sophia will do two
things: enter what they actually spent, and glance at whether they're on track for retirement.
Everything else (pay, benefits, budget lists, accounts, condo, goal, assumptions) is occasional
setup that only needs plain fields.

Success means: the monthly routine takes under a minute on one screen, setup is one scrollable page,
and the calculation engine (taxes, condo, projection, goal) keeps working unchanged.

## 2. Screens

Three screens replace the seven tabs: **Home**, **Months**, **Setup**. Routes: `#/home` (default),
`#/months`, `#/setup` and `#/setup/<section>` (scrolls to and opens that section).

The Together / Jerry / Sophia switch appears only on Home. Months and Setup always show both people
side by side.

### 2.1 Home

Top to bottom:

1. **Status** — small goal ring (% of goal), "Reach $2.5M by 2044 · 11 yrs early", odds of making it
   (Monte Carlo probability, number only), invested today.
2. **This month** — month label (current calendar month) and three amount fields: Jerry, Sophia,
   Shared. Empty fields show the planned amount as a placeholder. Under each entered field:
   "$400 under plan" / "$120 over plan". A summary line: "Saved $X this month · plan $Y".
3. **Year so far** — three numbers: spent vs plan, saved vs plan, and the goal effect of the
   savings difference ("goal 1 month sooner" / "on track either way"). Plus "At this pace: goal in
   2045" from the run rate (§3.4).
4. **Invested vs baseline** — chart of invested assets (account balances): the current projection
   (solid), the saved baseline (dashed), and balance updates as dots. Before any balance update it
   shows only the projection with a prompt to "Update balances".
5. **Insights** — top three, each linking to the relevant Setup section.

With the Jerry or Sophia scope, every number is that person's share: their personal spend plus
their share of shared spend, their accounts plus half of joint accounts, and their goal if the goal
is set for them (otherwise the household goal is shown with a "household goal" label).

### 2.2 Months

- **Table**, newest month first, from the current month back to the earliest month with a
  check-in. Columns: Month, Jerry, Sophia, Shared, Total, Plan, Difference, Saved. Jerry / Sophia /
  Shared cells are editable (same fields as Home). An "Add earlier month" button adds the month
  before the oldest row.
- **Chart** — monthly bars of actual total spend, a plan line, and the running savings difference.
- **Balance updates** — "Update balances" opens a drawer listing every account with its current
  balance in its own currency and a date (default today). Saving records a snapshot and sets each
  account's balance. Past snapshots are listed with date, total, and a delete button.

### 2.3 Setup

One page of collapsible sections. Each header shows a one-line summary and a "placeholder" badge if
any of its inputs are still placeholders. Sections start collapsed, except that a `#/setup/<section>`
link opens its section.

| Section | Inputs | Header summary |
| --- | --- | --- |
| Pay & benefits | Per person: name, birth year, salary, bonus %, RSU, ESPP, 401(k) traditional/Roth/after-tax %, match, HSA coverage + contribution, IRA amount + Roth/traditional | Take-home $13,348/mo · tax 29% |
| Budget | Personal expense lists (Jerry, Sophia), shared expense list, savings rate per person, shared-cost split, travel inputs, debts | Planned spending $X/mo · saving $Y/mo |
| Accounts | Accounts table (name, type, owner, balance, currency, return override, Canadian yearly contribution), where monthly savings go per person | Invested $X |
| Condo | All property inputs (value, mortgage, rent, costs, NR6, US basis) | Cash flow −C$771/mo · NR6 saves C$6,262/yr |
| Goal | Amount or yearly spending + withdrawal rate, date or age, whose goal, count condo equity | $2.5M by Jan 2055 |
| Assumptions & data | Returns, volatility, dividend yield, cash yield, inflation, salary growth, tax year, exchange rate, display currency, theme, export / import / reset | 8% returns · 2.5% inflation |

Fields reuse the existing input components (`MoneyField`, `NumberField`, `Segmented`, expense rows)
in plain rows. No charts in Setup.

### 2.4 Removed

Overview, Income & Taxes, Budget, Accounts & Savings, Property, Retirement Goal and Settings pages,
and the visualizations only they used: money-flow Sankey, paycheck strip, bracket ladders,
next-dollar card, side-by-side compare, category and bucket donuts, contributions chart, limit
bars, rent waterfall, equity chart, Schedule E card, glide-path chart, what-if sliders, Monte Carlo
fan chart. The engine functions behind them stay (they feed Home numbers and insights). The full
version remains available at tag `v1-full-dashboard`.

## 3. Check-ins and balances

### 3.1 Data (schema v2)

```ts
type MonthKey = string        // 'YYYY-MM'
interface MonthCheckIn { jerry: number | null; shared: number | null; sophia: number | null } // USD
interface BalanceSnapshot { id: string; date: string /* 'YYYY-MM-DD' */; balances: Record<string, number> } // account id → balance in the account's currency
interface Baseline { createdAt: string; startMonth: MonthKey; invested: Record<Scope, number[]> } // index 0 = startMonth

interface Plan {
  // …existing fields…
  schemaVersion: 2
  actuals: { months: Record<MonthKey, MonthCheckIn>; snapshots: BalanceSnapshot[]; baseline: Baseline | null }
}
```

Migration v1 → v2 adds `actuals: { months: {}, snapshots: [], baseline: null }`. Reset to sheet
defaults replaces everything except `actuals`. Export/import include `actuals`.

Saving balances is one undoable update: append the snapshot, set each listed account's `balance`,
and, if `baseline` is null, create the baseline (§3.5).

### 3.2 Plan for a month

Uses the current plan's figures (static model) for every month.

- `sharedPlan` = shared expenses (monthly, yearly ÷ 12) + travel ÷ 12.
- `share(p)` = person p's fraction of shared costs under the plan's split rule (even / by income /
  custom).
- `roomPlan(p)` = take-home(p) − planned monthly savings(p). This is the spending the projection
  assumes.
- `personalPlan(p)` = `roomPlan(p)` − `share(p)` × `sharedPlan`.
- Planned saving(p) = planned monthly savings(p).

Spending means everything paid from take-home pay. It excludes taxes, payroll deductions (401(k),
HSA, ESPP) and the condo, which the plan models separately. Bonus and RSU income are assumed to go
as planned.

### 3.3 Actuals for a month

A blank field means "as planned" for that field. A month counts as checked in if any field is set.

- `actualSpend(p)` = (personal(p) ?? `personalPlan(p)`) + `share(p)` × (shared ?? `sharedPlan`).
- `actualSaved(p)` = take-home(p) − `actualSpend(p)`.
- `difference(p)` = `actualSaved(p)` − planned saving(p). Positive means you saved more.
- Household = Jerry + Sophia.

### 3.4 How you're doing

- **So far** — sum of household `difference` over checked-in months after the latest snapshot's
  month (months at or before it are already in the balances). With no snapshot, all checked-in
  months count.
- **Goal effect of so far** — copy the plan, add each person's so-far difference to their first
  savings destination account (shared differences split by `share`), rerun the projection and
  goal, and compare `hitYear` and `onTrackPct` with the unadjusted plan. Shown in months, e.g.
  "goal 1 month sooner".
- **At this pace** — the average household difference over the last three checked-in months,
  passed to the projection as `extra.monthly` (negative allowed) on top of the so-far adjustment.
  It reports the resulting `hitYear`. It's hidden until there is at least one check-in.

### 3.5 Baseline and chart

- The baseline is created on the first balance save, or by "Reset baseline" on Months. It stores
  `projection.monthly[i].investable[scope]` for all three scopes, for i = 0…min(360, projection
  length), with `startMonth` = the snapshot's month.
- The chart's x-axis is months. Baseline index i is plotted at `startMonth + i`. The current
  projection is plotted from the latest snapshot's month (or the current month if there are none).
  Each snapshot is a dot of Σ balances (USD, scope share).

## 4. Code changes

- `src/engine/actuals.ts` (new, pure): `monthPlan(plan, r)`, `monthActual(plan, r, checkIn)`,
  `progress(plan, r, actuals, today)` → `{ soFar, runRate, monthsCounted }`, and
  `adjustedPlan(plan, r, soFar)`.
- `src/store/selectors.ts`: `selectProgress` and `selectGoalEffect`, memoized like the existing
  selectors.
- `src/model`: v2 types, migration, defaults (`actuals` empty); `PageId` becomes
  `'home' | 'months' | 'setup'`. `Insight.page` is replaced by `Insight.section?: SetupSection`.
- `src/ui/pages`: `HomePage`, `MonthsPage`, `SetupPage`, and `setup/*` for one component per
  section. Delete the seven old pages and the unused viz. `nav.ts`, `Sidebar` and `TopBar` are
  trimmed to three items, and the scope switch shows only on Home.
- Engine tax, payroll, rental, projection and goal code is unchanged.

## 5. Errors and edge cases

- Amounts clamp at ≥ 0. A cleared field returns to "as planned".
- A snapshot that references a deleted account ignores that account when plotted.
- Deleting the latest snapshot does not roll back account balances; it only changes which months
  count as "so far".
- Future months can't be entered. Months before the earliest check-in are hidden unless added.

## 6. Testing

- `actuals.test.ts`:
  - plan split for even, income and custom rules;
  - blanks mean planned;
  - the difference sign;
  - so-far excludes months at or before the latest snapshot;
  - run rate averages the last three;
  - the goal effect moves `hitYear` the right way for positive and negative differences.
- `schema.test.ts`: v1 → v2 migration; reset keeps actuals.
- `store.test.ts`: saving balances is one undo step and creates the baseline once.
- Browser: enter a month on Home → Months row updates → update balances → dot appears → undo; open
  each Setup section; scope switch on Home.
