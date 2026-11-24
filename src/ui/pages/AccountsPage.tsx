import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Account, AccountType, PersonId, Plan, Scope } from '../../model/types'
import { ACCOUNT_TYPE_LABEL, BUCKET_LABEL, BUCKET_OF, type Bucket } from '../../engine/accounts'
import { toUSD } from '../../engine/money'
import type { PlanResult } from '../../engine/plan'
import { scopeShare } from '../../engine/projection'
import { usePlanStore } from '../../store/planStore'
import { usePlan, usePlanResult } from '../../store/selectors'
import { useUiStore } from '../../store/uiStore'
import { Card, Metric } from '../components/Card'
import { AXIS_PROPS, ChartTooltip } from '../components/charts'
import { Badge, ProgressBar } from '../components/feedback'
import { Button, CURRENCY_PREFIX, CurrencyPill, EditableNumber, EditableText, Field, MoneyField, Segmented, SelectMenu } from '../components/inputs'
import { cn } from '../cn'
import { formatPct, useMoney } from '../format'
import { BUCKET_COLOR, BUCKET_ORDER, scopePeople } from '../data'

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]
const CANADIAN: ReadonlySet<AccountType> = new Set(['rrsp', 'tfsa', 'fhsa'])
const newId = () => Math.random().toString(36).slice(2, 9)

function AccountRow({ account, contribution, auto }: { account: Account; contribution: number; auto?: boolean }) {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const edit = (fn: (a: Account) => void) =>
    update((d) => {
      const a = d.accounts.find((x) => x.id === account.id)
      if (a) fn(a)
    })

  if (auto) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2.5">
        <Sparkles size={15} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{account.name}</div>
          <div className="text-[11px] text-faint">Receives contributions but isn’t in your list yet</div>
        </div>
        <span className="num text-sm text-positive">+{money(contribution)}/yr</span>
        <Button size="sm" variant="outline" onClick={() => update((d) => void d.accounts.push({ ...account, id: `${account.ownerId}-${account.type}-${newId()}`, name: account.name }))}>
          Add
        </Button>
      </div>
    )
  }

  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface">
      <div className="min-w-0">
        <EditableText value={account.name} onChange={(v) => edit((a) => void (a.name = v))} className="w-full font-medium" />
        <div className="flex items-center gap-1 px-2">
          <SelectMenu<AccountType>
            value={account.type}
            onChange={(v) => edit((a) => void (a.type = v))}
            options={ACCOUNT_TYPES.map((t) => ({ value: t, label: ACCOUNT_TYPE_LABEL[t] }))}
            className="-ml-2 px-1.5 py-0.5 text-[11px] text-faint"
            ariaLabel="Account type"
          />
          <SelectMenu<Account['ownerId']>
            value={account.ownerId}
            onChange={(v) => edit((a) => void (a.ownerId = v))}
            options={[...plan.people.map((p) => ({ value: p.id as Account['ownerId'], label: p.name })), { value: 'joint', label: 'Joint' }]}
            className="px-1.5 py-0.5 text-[11px] text-faint"
            ariaLabel="Owner"
          />
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] tracking-wide text-faint uppercase">This year</div>
        <div className={cn('num text-sm', contribution > 0 ? 'text-positive' : contribution < 0 ? 'text-negative' : 'text-faint')}>{contribution === 0 ? '—' : money(contribution, { sign: true })}</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] tracking-wide text-faint uppercase">Return</div>
        <EditableNumber value={account.expectedReturnPct ?? null} placeholder="default" onChange={(v) => edit((a) => void (a.expectedReturnPct = v))} suffix="%" decimals={1} min={-10} max={30} size="sm" />
      </div>
      <div className="flex items-center gap-1">
        <EditableNumber value={account.balance} onChange={(v) => edit((a) => void (a.balance = v))} prefix={CURRENCY_PREFIX[account.currency]} min={0} step={1000} className="font-medium" ariaLabel={`${account.name} balance`} />
        <CurrencyPill value={account.currency} onChange={(c) => edit((a) => void (a.currency = c))} />
      </div>
      <button
        type="button"
        aria-label={`Delete ${account.name}`}
        onClick={() =>
          update((d) => {
            d.accounts = d.accounts.filter((a) => a.id !== account.id)
            for (const p of d.people) p.savingsAllocation = p.savingsAllocation.filter((x) => x.accountId !== account.id)
          })
        }
        className="rounded-lg p-1.5 text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-negative/10 hover:text-negative"
      >
        <Trash2 size={14} />
      </button>
      {CANADIAN.has(account.type) && (
        <div className="col-span-5 -mt-1 flex items-center justify-between px-2 pb-1 text-xs text-faint">
          <span>Yearly contribution (paid from savings first)</span>
          <EditableNumber value={account.annualContribution ?? 0} onChange={(v) => edit((a) => void (a.annualContribution = v))} prefix={CURRENCY_PREFIX[account.currency]} min={0} size="sm" />
        </div>
      )}
    </div>
  )
}

function AccountsCard({ scope, r }: { scope: Scope; r: PlanResult }) {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const flows = r.savings.household.byAccount
  const visible = (a: Account) => scope === 'household' || a.ownerId === scope || a.ownerId === 'joint'
  const accounts = plan.accounts.filter(visible)
  const autos = r.autoAccounts.filter(visible)
  const fx = plan.settings.fxCadPerUsd
  const owner: PersonId | 'joint' = scope === 'household' ? 'joint' : scope

  return (
    <Card
      title="Accounts"
      subtitle="Balances today and what flows in this year"
      action={
        <Button size="sm" variant="outline" onClick={() => update((d) => void d.accounts.push({ id: `acct-${newId()}`, name: 'New account', type: 'brokerage', ownerId: owner, balance: 0, currency: 'USD' }))}>
          <Plus size={14} /> Add account
        </Button>
      }
    >
      <div className="space-y-5">
        {BUCKET_ORDER.map((bucket) => {
          const list = accounts.filter((a) => BUCKET_OF[a.type] === bucket)
          const autoList = autos.filter((a) => BUCKET_OF[a.type] === bucket)
          if (list.length === 0 && autoList.length === 0) return null
          const total = list.reduce((s, a) => s + toUSD(a.balance, a.currency, fx) * scopeShare(a.ownerId, scope), 0)
          return (
            <div key={bucket}>
              <div className="mb-1 flex items-center justify-between px-2">
                <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
                  <span className="size-2 rounded-full" style={{ background: BUCKET_COLOR[bucket] }} />
                  {BUCKET_LABEL[bucket]}
                </span>
                <span className="num text-xs text-muted">{money(total)}</span>
              </div>
              <div className="space-y-0.5">
                {list.map((a) => (
                  <AccountRow key={a.id} account={a} contribution={flows[a.id] ?? 0} />
                ))}
                {autoList.map((a) => (
                  <AccountRow key={a.id} account={a} contribution={flows[a.id] ?? 0} auto />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function BucketDonut({ scope, r }: { scope: Scope; r: PlanResult }) {
  const plan = usePlan()
  const { money, compact } = useMoney()
  const fx = plan.settings.fxCadPerUsd
  const balances: Record<Bucket, number> = { preTax: 0, roth: 0, taxable: 0, cash: 0, canadian: 0 }
  for (const a of plan.accounts) balances[BUCKET_OF[a.type]] += toUSD(a.balance, a.currency, fx) * scopeShare(a.ownerId, scope)
  const hasBalances = Object.values(balances).some((v) => v > 0)
  const source = hasBalances ? balances : r.savings[scope].byBucket
  const data = BUCKET_ORDER.map((b) => ({ id: b, name: BUCKET_LABEL[b], value: Math.max(0, source[b]), color: BUCKET_COLOR[b] })).filter((d) => d.value > 0.5)
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <Card title={hasBalances ? 'Balances by tax treatment' : 'This year’s savings by tax treatment'} subtitle={hasBalances ? undefined : 'Add balances to see your current mix'}>
      {total === 0 ? (
        <p className="text-sm text-faint">Nothing yet.</p>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative size-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" cornerRadius={4}>
                  {data.map((d) => (
                    <Cell key={d.id} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={(p) => <ChartTooltip {...p} format={(v) => money(v)} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="num font-semibold">{compact(total)}</div>
              <div className="text-[10px] text-faint">{hasBalances ? 'total' : 'per year'}</div>
            </div>
          </div>
          <ul className="flex-1 space-y-1.5 text-sm">
            {data.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-muted">
                  <span className="size-2 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="num">{formatPct((d.value / total) * 100, 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function ContributionsChart({ scope, r }: { scope: Scope; r: PlanResult }) {
  const plan = usePlan()
  const { money, compact } = useMoney()
  const meta = new Map([...plan.accounts, ...r.autoAccounts].map((a) => [a.id, a]))
  const data = Object.entries(r.savings.household.byAccount)
    .map(([id, v]) => {
      const a = meta.get(id)
      return { id, name: a?.name ?? id, value: v * scopeShare(a?.ownerId ?? 'joint', scope), color: a ? BUCKET_COLOR[BUCKET_OF[a.type]] : 'var(--chart-5)' }
    })
    .filter((d) => Math.abs(d.value) > 0.5)
    .sort((a, b) => b.value - a.value)
  return (
    <Card title="Where savings go this year" subtitle={`${money(r.savings[scope].totalAnnual)} into accounts · ${money(r.savings[scope].equityBuildAnnual)} into condo equity`}>
      <ResponsiveContainer width="100%" height={Math.max(60, data.length * 38)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" {...AXIS_PROPS} width={170} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <Tooltip cursor={{ fill: 'var(--surface)' }} content={(p) => <ChartTooltip {...p} format={(v) => `${money(v)}/yr`} />} />
          <Bar dataKey="value" name="Contribution" radius={[0, 6, 6, 0]} maxBarSize={22} label={{ position: 'right', fill: 'var(--muted)', fontSize: 11, formatter: (v: unknown) => compact(Number(v)) }}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

function LimitRow({ label, used, limit, hint }: { label: string; used: number; limit: number; hint?: string }) {
  const { money } = useMoney()
  const pct = limit > 0 ? used / limit : 0
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="num text-xs text-muted">
          {money(used)} <span className="text-faint">of {money(limit)}</span>
        </span>
      </div>
      <ProgressBar value={used} max={limit} tone={pct > 1.001 ? 'negative' : pct >= 0.999 ? 'positive' : 'accent'} />
      {hint && <div className="mt-1 text-[11px] text-faint">{hint}</div>}
    </div>
  )
}

function PersonSavingsCard({ id, r }: { id: PersonId; r: PlanResult }) {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const person = plan.people.find((p) => p.id === id)!
  const pr = r.people[id]
  const s = r.savings[id]
  const t = r.tables
  const c = pr.contributions
  const age = pr.age
  const deferralLimit = t.limits.k401 + (age >= 60 && age <= 63 ? t.limits.k401CatchUp6063 : age >= 50 ? t.limits.k401CatchUp50 : 0)
  const hsaLimit = person.payroll.hsaCoverage === 'family' ? t.limits.hsaFamily : t.limits.hsaSelf
  const allocOptions = [...plan.accounts, ...r.autoAccounts]
    .filter((a) => (a.ownerId === id || a.ownerId === 'joint') && (a.type === 'brokerage' || a.type === 'cash'))
    .map((a) => ({ value: a.id, label: `${a.name}` }))
  const allocTotal = person.savingsAllocation.reduce((sum, a) => sum + a.pct, 0)
  const setPerson = (fn: (p: Plan['people'][number]) => void) => update((d) => fn(d.people.find((p) => p.id === id)!))

  return (
    <Card title={`${person.name}’s savings`} subtitle={`${money(s.totalAnnual)}/yr into accounts · ${formatPct(s.savingsRateOfGross * 100, 0)} of gross`}>
      <div className="text-xs font-semibold tracking-wide text-muted uppercase">Limits {t.year}</div>
      <LimitRow label="401(k) deferrals" used={c.k401Trad + c.k401Roth} limit={deferralLimit} hint={c.match > 0 ? `+ ${money(c.match)} employer match` : undefined} />
      <LimitRow label="All 401(k) money (415c)" used={c.k401Trad + c.k401Roth + c.k401AfterTax + c.match} limit={t.limits.dc415c} />
      <LimitRow label={s.iraBackdoor ? 'IRA (backdoor Roth)' : 'IRA'} used={s.iraContribution} limit={pr.iraLimit} />
      {person.payroll.hsaCoverage !== 'none' && <LimitRow label="HSA" used={c.hsaEmployee + c.hsaEmployer} limit={hsaLimit} />}

      <div className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">IRA</div>
      <MoneyField label="Yearly IRA contribution" hint={pr.rothIraAllowedDirect ? 'Direct Roth allowed at this income' : `Above the Roth limit — contributed via backdoor`} value={person.ira.annualContribution} onChange={(v) => setPerson((p) => void (p.ira.annualContribution = v))} max={pr.iraLimit} step={500} />
      <Field label="IRA type">
        <Segmented
          size="sm"
          value={person.ira.kind}
          onChange={(v) => setPerson((p) => void (p.ira.kind = v))}
          options={[
            { value: 'roth', label: 'Roth' },
            { value: 'traditional', label: 'Traditional' },
          ]}
        />
      </Field>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">Monthly savings go to</span>
        {Math.abs(allocTotal - 100) > 0.01 && person.savingsAllocation.length > 0 && <Badge tone="warning">{formatPct(allocTotal, 0)} — scaled to 100%</Badge>}
      </div>
      <div className="mt-1.5 space-y-1">
        {person.savingsAllocation.map((a, i) => (
          <div key={`${a.accountId}-${i}`} className="group flex items-center gap-2">
            <SelectMenu value={a.accountId} onChange={(v) => setPerson((p) => void (p.savingsAllocation[i].accountId = v))} options={allocOptions.some((o) => o.value === a.accountId) ? allocOptions : [...allocOptions, { value: a.accountId, label: a.accountId }]} className="min-w-0 flex-1 justify-between" ariaLabel="Allocation account" />
            <EditableNumber value={a.pct} onChange={(v) => setPerson((p) => void (p.savingsAllocation[i].pct = v))} suffix="%" min={0} max={100} />
            <button type="button" aria-label="Remove allocation" onClick={() => setPerson((p) => void p.savingsAllocation.splice(i, 1))} className="rounded-lg p-1 text-faint opacity-0 group-hover:opacity-100 hover:text-negative">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {person.savingsAllocation.length === 0 && <p className="text-xs text-faint">Everything goes to {person.name}’s brokerage.</p>}
        {allocOptions.length > 0 && (
          <Button size="sm" onClick={() => setPerson((p) => void p.savingsAllocation.push({ accountId: allocOptions[0].value, pct: Math.max(0, 100 - allocTotal) }))}>
            <Plus size={14} /> Add destination
          </Button>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-faint">The IRA and any Canadian contributions are funded first; the rest is split as above.</p>
    </Card>
  )
}

export function AccountsPage() {
  const plan = usePlan()
  const r = usePlanResult()
  const scope = useUiStore((s) => s.scope)
  const { money } = useMoney()
  const s = r.savings[scope]
  const fx = plan.settings.fxCadPerUsd
  const invested = plan.accounts.reduce((sum, a) => sum + toUSD(a.balance, a.currency, fx) * scopeShare(a.ownerId, scope), 0)
  const advantaged = s.byBucket.preTax + s.byBucket.roth
  const balancesMissing = plan.placeholders.includes('accounts.balances') || invested === 0

  return (
    <div className="grid grid-cols-12 gap-5">
      <Card className="col-span-6 xl:col-span-3">
        <Metric label="Invested today" value={invested} format={(v) => money(v)} sub={balancesMissing ? 'Add balances below' : 'across all accounts'} />
      </Card>
      <Card className="col-span-6 xl:col-span-3">
        <Metric label="Saved this year" value={s.totalAnnual} format={(v) => money(v)} tone="accent" sub={`${money(s.totalAnnual / 12)}/mo into accounts`} />
      </Card>
      <Card className="col-span-6 xl:col-span-3">
        <Metric label="Employer money" value={s.employerAnnual} format={(v) => money(v)} tone={s.employerAnnual > 0 ? 'positive' : 'default'} sub="401(k) match + HSA" />
      </Card>
      <Card className="col-span-6 xl:col-span-3">
        <Metric label="Tax-advantaged" value={s.totalAnnual > 0 ? (advantaged / s.totalAnnual) * 100 : 0} format={(v) => formatPct(v, 0)} sub="of this year’s savings" />
      </Card>

      <div className="col-span-12 space-y-5 xl:col-span-7">
        <AccountsCard scope={scope} r={r} />
        <ContributionsChart scope={scope} r={r} />
      </div>
      <div className="col-span-12 space-y-5 xl:col-span-5">
        <BucketDonut scope={scope} r={r} />
        {scopePeople(scope).map((id) => (
          <PersonSavingsCard key={id} id={id} r={r} />
        ))}
        <Card title="Canadian accounts" subtitle="Living in the US">
          <ul className="space-y-2 text-xs leading-relaxed text-muted">
            <li><span className="font-medium text-ink">RRSP</span> — keeps growing tax-deferred under the treaty; contributions aren’t deductible in the US.</li>
            <li><span className="font-medium text-ink">TFSA / FHSA</span> — not tax-free in the US: growth is taxed yearly, and new TFSA contributions as a non-resident cost 1% a month.</li>
            <li>Balances can be entered in CAD; they’re converted at the rate in Settings.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
