# Tandem

A planning dashboard for Jerry and Sophia, built from the "2027 Couples Budget USD" sheet in
`Finances.numbers`. It plans month-by-month budgets, taxes, savings and a retirement goal. It does
not track transactions.

## Run it

Node is installed under `~/.local/node`, so put it on your `PATH` first:

```sh
export PATH="$HOME/.local/node/bin:$PATH"
cd ~/tandem
npm install        # first time only
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Engine and store unit tests (Vitest) |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | oxlint |
| `npm run build` | Production build into `dist/` |

## Pages

- **Overview** — net worth and its projection, goal progress, take-home / saving / free-to-spend /
  tax rate, a monthly money-flow diagram and the top insights.
- **Income & Taxes** — salary, bonus, RSUs, ESPP, 401(k), HSA; the paycheck breakdown; federal,
  NY and NYC brackets; what the next $1,000 of pay or pre-tax saving is worth.
- **Budget** — personal and shared expenses (monthly or yearly), debts, the savings rate, how
  shared costs and travel are split.
- **Accounts & Savings** — balances by tax treatment, where this year's savings go, contribution
  limits, IRA / backdoor Roth, and where monthly savings are invested.
- **Property** — the Canadian condo: monthly cash flow after every cost and tax, NR6 vs Part XIII,
  US Schedule E with depreciation and the passive-loss rules, and equity over time.
- **Retirement Goal** — target amount or yearly spending, date or age; the path to the goal vs. what
  is needed each year; how much more or less to save; what-if sliders that can be applied to the
  plan; odds across 1,000 simulated markets.
- **Settings** — assumptions, tax year, exchange rate, names and birth years, inputs still using
  placeholders, theme, export / import / reset.

The **Together / Jerry / Sophia** switch in the top bar changes the view on every page except
Property and Settings. Joint accounts count half for each person. Every number with an ⓘ explains
how it was calculated. Edits save automatically, and ⌘Z / ⇧⌘Z undo and redo.

## Your data

The plan is one JSON document saved in this browser's `localStorage` under `tandem.plan.v1`.
Nothing leaves your machine. Use **Settings → Export plan** for a backup (or to move browsers), and
**Import plan** to load one. **Reset to sheet defaults** goes back to the values from the
spreadsheet; it can be undone. If saved data ever can't be read, Tandem starts from the defaults,
keeps the original under `tandem.plan.v1.unreadable`, and says so.

`src/store/repository.ts` is the only code that touches storage, so it can be swapped for Supabase
later without changing anything else.

## How it calculates

- **Taxes (2026 and 2027, single filers, Brooklyn residents):** federal brackets and standard
  deduction; Social Security, Medicare and Additional Medicare; NY State tax including the
  tax-benefit recapture, NY SDI and Paid Family Leave; NYC resident tax and school tax credits.
  2027 values come from published figures where available, otherwise they are indexed by inflation.
- **Condo:** Canadian non-resident tax (Part XIII at 25% of gross rent, or NR6 + Section 216 on net
  rent); US Schedule E with 30-year straight-line depreciation; the $25k passive-loss allowance and
  carry-forward; foreign tax credit. The mortgage compounds semi-annually, as Canadian mortgages do.
- **Canadian accounts:** the RRSP grows tax-deferred under the treaty; TFSA and FHSA growth is
  taxed yearly in the US.
- **Projection:** month by month, with each year's taxes and contributions recomputed (salary
  growth, inflation-indexed brackets, mortgage and debt payoff). Returns are after the yearly tax
  on dividends and interest in taxable accounts.
- **Goal:** the extra monthly saving needed, the savings rate and return that would reach the goal,
  the "coast" number, and a glide path worked backwards from the target. The odds come from 1,000
  simulated return sequences (seeded, so they're stable between visits).

### Corrections to the spreadsheet

1. Sophia's take-home skipped federal tax and used Jerry's state and city tax.
2. FICA and the standard deductions were missing, and the brackets were from 2023.
3. The net-worth projection counted current net worth twice and mixed CAD and USD.
4. Pre-tax savings were counted twice when the pre-tax percentage was above zero.
5. The shared budget ignored each person's own fixed costs.
6. RSU vesting was added to savings untaxed.

The sheet's 63% savings rate leaves Jerry's monthly budget short. This is shown as an insight, not
changed.

### Placeholders

A few inputs weren't in the sheet: birth years, the condo's purchase details and mortgage rate,
account balances, and the goal itself. **Settings → Still using placeholders** lists them, and
each one clears as soon as you edit it.

These are planning estimates, not tax advice.

## Code map

```
src/engine   pure calculation (taxes, payroll, rental, budgets, savings, projection, goal)
src/model    plan types, sheet defaults, schema migration, placeholders
src/store    zustand store (undo/redo, autosave), repository, memoized selectors
src/ui       shell, pages, charts and inputs; four themes in src/index.css
docs         design spec and implementation plan
```
