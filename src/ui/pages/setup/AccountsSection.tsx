import { Plus, Sparkles, Trash2 } from 'lucide-react'
import type { Account, AccountType, PersonId, Plan, Scope } from '../../../model/types'
import { ACCOUNT_TYPE_LABEL, BUCKET_LABEL, BUCKET_OF } from '../../../engine/accounts'
import { toUSD } from '../../../engine/money'
import type { PlanResult } from '../../../engine/plan'
import { scopeShare } from '../../../engine/projection'
import { usePlanStore } from '../../../store/planStore'
import { usePlan, usePlanResult } from '../../../store/selectors'
import { Card } from '../../components/Card'
import { Badge } from '../../components/feedback'
import { Button, CURRENCY_PREFIX, CurrencyPill, EditableNumber, EditableText, Field, MoneyField, Segmented, SelectMenu } from '../../components/inputs'
import { cn } from '../../cn'
import { formatPct, useMoney } from '../../format'
import { BUCKET_COLOR, BUCKET_ORDER } from '../../data'

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

function PersonSavingsCard({ id, r }: { id: PersonId; r: PlanResult }) {
  const plan = usePlan()
  const update = usePlanStore((s) => s.update)
  const { money } = useMoney()
  const person = plan.people.find((p) => p.id === id)!
  const pr = r.people[id]
  const s = r.savings[id]
  const allocOptions = [...plan.accounts, ...r.autoAccounts]
    .filter((a) => (a.ownerId === id || a.ownerId === 'joint') && (a.type === 'brokerage' || a.type === 'cash'))
    .map((a) => ({ value: a.id, label: `${a.name}` }))
  const allocTotal = person.savingsAllocation.reduce((sum, a) => sum + a.pct, 0)
  const setPerson = (fn: (p: Plan['people'][number]) => void) => update((d) => fn(d.people.find((p) => p.id === id)!))

  return (
    <Card title={`${person.name}’s savings`} subtitle={`${money(s.totalAnnual)}/yr into accounts · ${formatPct(s.savingsRateOfGross * 100, 0)} of gross`}>
      <div className="text-xs font-semibold tracking-wide text-muted uppercase">IRA</div>
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

export function AccountsSection() {
  const r = usePlanResult()
  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-12 xl:col-span-7">
        <AccountsCard scope="household" r={r} />
      </div>
      <div className="col-span-12 space-y-5 xl:col-span-5">
        <PersonSavingsCard id="jerry" r={r} />
        <PersonSavingsCard id="sophia" r={r} />
      </div>
    </div>
  )
}
