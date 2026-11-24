import { ArrowRight, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { usePlan, useGoal, usePlanResult, useProjection } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { Card, Metric } from '../components/Card'
import { filterInsights, InsightList } from '../components/feedback'
import { Segmented } from '../components/inputs'
import { scopePeople, sumPeople } from '../data'
import { formatPct, useMoney } from '../format'
import { GoalRing } from '../viz/GoalRing'
import { MoneyFlow } from '../viz/MoneyFlow'
import { NetWorthChart, NetWorthLegend } from '../viz/NetWorthChart'

export function OverviewPage() {
  const plan = usePlan()
  const r = usePlanResult()
  const proj = useProjection()
  const { goal } = useGoal()
  const scope = useUiStore((s) => s.scope)
  const setPage = useUiStore((s) => s.setPage)
  const { money, compact } = useMoney()
  const [real, setReal] = useState(false)

  const scopeName = scope === 'household' ? 'Together' : plan.people.find((p) => p.id === scope)!.name
  const nw0 = proj.years[0].netWorth[scope]
  const nw1 = proj.years[1]?.netWorth[scope] ?? nw0
  const goalT = Math.min(proj.years.length - 1, Math.round(goal.target.yearsAway))
  const nwGoal = proj.years[goalT].netWorth[scope]
  const nwGoalReal = nwGoal * proj.years[goalT].deflator

  const b = r.budgets[scope]
  const s = r.savings[scope]
  const takeHome = sumPeople(r, scope, (p) => p.takeHomeMonthly)
  const gross = sumPeople(r, scope, (p) => p.grossIncome)
  const taxTotal = sumPeople(r, scope, (p) => p.taxes.wageTotal + p.taxes.rsuTax + p.taxes.rentalTax)
  const effective = gross > 0 ? (taxTotal / gross) * 100 : 0
  const people = scopePeople(scope)
  const spark = proj.years.slice(0, goalT + 1).map((y) => ({ year: y.year, v: y.netWorth[scope] }))

  const pct = goal.onTrackPct
  const goalScopeName = plan.goal.scope === 'household' ? 'together' : plan.people.find((p) => p.id === plan.goal.scope)!.name

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="relative col-span-12 overflow-hidden lg:col-span-8" bodyClassName="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <Metric
            label={`Net worth · ${scopeName}`}
            value={nw0}
            format={(v) => money(v)}
            size="xl"
            sub={
              <span className="inline-flex items-center gap-1 text-positive">
                <TrendingUp size={13} /> {money(nw1 - nw0, { sign: true })} projected over the next 12 months
              </span>
            }
            explain={{
              title: 'Net worth today',
              lines: [
                { label: 'Investment accounts', value: money(proj.years[0].investable[scope]) },
                { label: 'Real estate equity', value: money(proj.years[0].equity[scope]), kind: 'add' },
                { label: 'Debts', value: money(proj.years[0].debtsUsd[scope]), kind: 'sub' },
                { label: 'Net worth', value: money(nw0), kind: 'total' },
                { label: 'Condo equity = market value − mortgage, converted at the CAD rate in Settings.', value: '', kind: 'note' },
              ],
            }}
          />
          <div className="text-right">
            <div className="text-[13px] text-muted">By {goal.target.year}</div>
            <div className="num mt-1.5 text-2xl font-semibold">{compact(nwGoal)}</div>
            <div className="mt-1 text-xs text-faint">{compact(nwGoalReal)} in today’s dollars</div>
          </div>
        </div>
        <div className="-mx-6 -mb-6 mt-4 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.45 }} />
                  <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} fill="url(#spark)" isAnimationActive animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="col-span-12 lg:col-span-4" title="Retirement goal" subtitle={`${compact(goal.target.today)} in today’s dollars · ${goalScopeName} · ${goal.target.year}`}>
        <div className="flex items-center gap-5">
          <GoalRing pct={pct} size={132} stroke={11}>
            <div className="num text-2xl font-semibold">{formatPct(Math.min(pct * 100, 999), 0)}</div>
            <div className="text-[11px] text-faint">of target</div>
          </GoalRing>
          <div className="min-w-0 flex-1 space-y-2.5 text-sm">
            <div>
              <div className="text-xs text-muted">Projected</div>
              <div className="num font-medium">{compact(goal.projectedAtTarget)}</div>
            </div>
            <div>
              <div className="text-xs text-muted">Target ({goal.target.year} dollars)</div>
              <div className="num font-medium">{compact(goal.target.nominal)}</div>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setPage('goal')} className="group mt-4 flex w-full items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[color-mix(in_oklab,var(--surface-2)_70%,var(--accent)_12%)]">
          <span>
            {goal.gapMonthly > 1 ? (
              <>
                Save <span className="num font-semibold text-ink">{money(goal.gapMonthly)}/mo</span> more to get there
              </>
            ) : (
              <>
                On track{goal.hitYear ? <> — reach it by <span className="font-semibold">{goal.hitYear}</span></> : null}
              </>
            )}
          </span>
          <ArrowRight size={15} className="text-muted transition-transform group-hover:translate-x-0.5" />
        </button>
      </Card>

      <Card className="col-span-6 xl:col-span-3">
        <Metric
          label="Take-home pay"
          value={takeHome}
          format={(v) => `${money(v)}`}
          sub="per month, after taxes and payroll savings"
          explain={{
            title: 'Monthly take-home',
            lines: [
              { label: 'Salary + bonus (cash)', value: money(sumPeople(r, scope, (p) => p.cashComp) / 12) },
              { label: 'Income taxes + FICA', value: money(sumPeople(r, scope, (p) => p.taxes.wageTotal) / 12), kind: 'sub' },
              { label: '401(k), HSA, ESPP', value: money(sumPeople(r, scope, (p) => p.contributions.k401Trad + p.contributions.k401Roth + p.contributions.k401AfterTax + p.contributions.hsaEmployee + p.contributions.esppContribution) / 12), kind: 'sub' },
              { label: 'Benefit premiums', value: money(sumPeople(r, scope, (p) => p.premiums) / 12), kind: 'sub' },
              { label: 'Bonus routed to savings', value: money(sumPeople(r, scope, (p) => p.bonusAfterTax) / 12), kind: 'sub' },
              { label: 'Take-home', value: money(takeHome), kind: 'total' },
            ],
          }}
        />
      </Card>
      <Card className="col-span-6 xl:col-span-3">
        <Metric
          label="Saving & investing"
          value={(s.totalAnnual + s.equityBuildAnnual) / 12}
          format={(v) => money(v)}
          tone="accent"
          sub={`${formatPct(s.savingsRateOfGross * 100, 0)} of gross income, incl. condo equity`}
          explain={{
            title: 'Monthly saving',
            lines: [
              { label: 'From take-home', value: money(s.takeHomeSavingsAnnual / 12) },
              { label: 'Payroll (401k, HSA, ESPP, RSUs)', value: money((s.totalAnnual - s.takeHomeSavingsAnnual - s.rentalCashFlowAnnual) / 12), kind: 'add' },
              { label: 'Condo cash flow', value: money(s.rentalCashFlowAnnual / 12), kind: s.rentalCashFlowAnnual < 0 ? 'note' : 'add' },
              { label: 'Into accounts', value: money(s.totalAnnual / 12), kind: 'total' },
              { label: 'Mortgage principal (equity)', value: money(s.equityBuildAnnual / 12), kind: 'add' },
              ...(s.rentalCashFlowAnnual < 0 ? [{ label: `The condo's ${money(-s.rentalCashFlowAnnual / 12)}/mo shortfall is covered from savings first.`, value: '', kind: 'note' as const }] : []),
            ],
          }}
        />
      </Card>
      <Card className="col-span-6 xl:col-span-3">
        <Metric
          label="Free to spend"
          value={b.discretionary}
          format={(v) => money(v)}
          tone={b.discretionary < 0 ? 'negative' : 'default'}
          sub={b.discretionary < 0 ? `over budget · break-even savings rate ${formatPct(b.breakEvenSavingsRatePct, 0)}` : 'per month after savings, bills and set-asides'}
          explain={{
            title: 'Monthly spending money',
            lines: [
              { label: 'Take-home', value: money(b.takeHome) },
              { label: `Savings (${formatPct(b.savingsRatePct, 0)})`, value: money(b.savings), kind: 'sub' },
              { label: 'Fixed bills', value: money(b.fixed), kind: 'sub' },
              { label: 'Yearly costs ÷ 12', value: money(b.yearlyMonthly), kind: 'sub' },
              { label: 'Free to spend', value: money(b.discretionary), kind: 'total' },
            ],
          }}
        />
      </Card>
      <Card className="col-span-6 xl:col-span-3">
        <Metric
          label="Effective tax rate"
          value={effective}
          format={(v) => formatPct(v, 1)}
          sub={
            people.length === 1
              ? `${money(taxTotal)}/yr · marginal ${formatPct(r.people[people[0]].marginalRate * 100, 0)}`
              : `${money(taxTotal)}/yr · marginal ${people.map((id) => formatPct(r.people[id].marginalRate * 100, 0)).join(' / ')}`
          }
          explain={{
            title: `${r.year} taxes`,
            lines: [
              { label: 'Federal income tax', value: money(sumPeople(r, scope, (p) => p.taxes.all.federal)) },
              { label: 'New York State', value: money(sumPeople(r, scope, (p) => p.taxes.all.nyState)) },
              { label: 'New York City', value: money(sumPeople(r, scope, (p) => p.taxes.all.nyc - p.taxes.all.nycCredits)) },
              { label: 'Social Security + Medicare', value: money(sumPeople(r, scope, (p) => p.taxes.all.socialSecurity + p.taxes.all.medicare + p.taxes.all.additionalMedicare)) },
              { label: 'NY PFL + SDI', value: money(sumPeople(r, scope, (p) => p.taxes.all.pfl + p.taxes.all.sdi)) },
              { label: 'Total', value: money(taxTotal), kind: 'total' },
              { label: 'Includes the condo’s effect on US taxes. Canadian tax on the condo is counted in its cash flow.', value: '', kind: 'note' },
            ],
          }}
        />
      </Card>

      <Card className="col-span-12 xl:col-span-8" title="Where the money goes" subtitle="A typical month">
        <div className="h-full min-h-[380px]">
          <MoneyFlow result={r} scope={scope} />
        </div>
      </Card>
      <Card className="col-span-12 xl:col-span-4" title="Insights" subtitle="What to look at next">
        <InsightList insights={filterInsights(r.insights, scope)} limit={5} clamp />
      </Card>

      <Card
        className="col-span-12"
        title="Net worth projection"
        subtitle={real ? 'In today’s dollars' : 'In future (nominal) dollars'}
        action={
          <Segmented
            size="sm"
            value={real ? 'real' : 'nominal'}
            onChange={(v) => setReal(v === 'real')}
            options={[
              { value: 'nominal', label: 'Nominal' },
              { value: 'real', label: 'Today’s $' },
            ]}
          />
        }
      >
        <NetWorthChart
          projection={proj}
          scope={scope}
          real={real}
          height={320}
          goal={plan.goal.scope === scope ? { year: goal.target.year, amount: real ? goal.target.today : goal.target.nominal } : undefined}
        />
        <div className="mt-3">
          <NetWorthLegend projection={proj} scope={scope} />
        </div>
      </Card>
    </div>
  )
}
