import { ResponsiveContainer, Sankey, Tooltip, type SankeyLinkProps as LinkProps, type SankeyNodeProps as NodeProps } from 'recharts'
import type { Scope } from '../../model/types'
import type { PlanResult } from '../../engine/plan'
import { ChartTooltip } from '../components/charts'
import { useMoney } from '../format'
import { sumPeople } from '../data'

interface FlowNode {
  name: string
  color: string
}

const C = {
  income: 'var(--chart-6)',
  gross: 'var(--accent)',
  tax: 'var(--negative)',
  payroll: 'var(--chart-2)',
  rsu: 'var(--chart-5)',
  benefits: 'var(--faint)',
  takeHome: 'var(--accent-2)',
  saved: 'var(--positive)',
  fixed: 'var(--chart-4)',
  yearly: 'var(--chart-7)',
  free: 'var(--chart-3)',
  short: 'var(--negative)',
  condo: 'var(--chart-7)',
}

/** Monthly money flow: income → taxes / payroll savings / take-home → savings and spending. */
export function buildFlow(r: PlanResult, scope: Scope) {
  const m = (x: number) => x / 12
  const base = sumPeople(r, scope, (p) => p.base)
  const bonus = sumPeople(r, scope, (p) => p.bonus)
  const rsu = sumPeople(r, scope, (p) => p.rsu)
  const taxes = sumPeople(r, scope, (p) => p.taxes.wageTotal + p.taxes.rsuTax)
  const payroll = sumPeople(r, scope, (p) => p.contributions.k401Trad + p.contributions.k401Roth + p.contributions.k401AfterTax + p.contributions.hsaEmployee + p.contributions.esppContribution)
  const premiums = sumPeople(r, scope, (p) => p.premiums)
  const rsuNet = sumPeople(r, scope, (p) => p.rsuNet)
  const takeHome = sumPeople(r, scope, (p) => p.takeHomeAnnual)
  const bonusSaved = sumPeople(r, scope, (p) => p.bonusAfterTax)
  const b = r.budgets[scope]
  const rentalCf = r.savings[scope].rentalCashFlowAnnual

  const nodes: FlowNode[] = []
  const links: { source: number; target: number; value: number }[] = []
  const node = (name: string, color: string) => nodes.push({ name, color }) - 1
  const link = (s: number, t: number, v: number) => v > 0.5 && links.push({ source: s, target: t, value: v })

  const gross = node('Gross pay', C.gross)
  link(node('Salary', C.income), gross, m(base))
  if (bonus > 0.5) link(node('Bonus', C.income), gross, m(bonus))
  if (rsu > 0.5) link(node('RSU vests', C.rsu), gross, m(rsu))

  link(gross, node('Taxes', C.tax), m(taxes))
  if (payroll > 0.5) link(gross, node('401(k), HSA, ESPP', C.payroll), m(payroll))
  if (rsuNet > 0.5) link(gross, node('RSUs kept', C.rsu), m(rsuNet))
  if (premiums > 0.5) link(gross, node('Benefits', C.benefits), m(premiums))
  const th = node('Take-home', C.takeHome)
  link(gross, th, m(takeHome))

  let saved = b.savings + m(bonusSaved)
  if (rentalCf < 0) {
    const condoCost = Math.min(saved, m(-rentalCf))
    link(th, node('Condo shortfall', C.condo), condoCost)
    saved -= condoCost
  }
  const savedNode = node('Invested', C.saved)
  link(th, savedNode, saved)
  if (rentalCf > 0) link(node('Rental income', C.condo), savedNode, m(rentalCf))
  link(th, node('Fixed bills', C.fixed), b.fixed)
  link(th, node('Yearly set-asides', C.yearly), b.yearlyMonthly)
  if (b.discretionary >= 0) link(th, node('Free to spend', C.free), b.discretionary)
  else link(node('Over budget', C.short), th, -b.discretionary)

  const used = new Set(links.flatMap((l) => [l.source, l.target]))
  const remap = new Map<number, number>()
  const keptNodes = nodes.filter((_, i) => used.has(i) && remap.set(i, remap.size))
  return {
    nodes: keptNodes,
    links: links.map((l) => ({ ...l, source: remap.get(l.source)!, target: remap.get(l.target)! })),
  }
}

export function MoneyFlow({ result, scope, height = '100%' }: { result: PlanResult; scope: Scope; height?: number | `${number}%` }) {
  const { money } = useMoney()
  const data = buildFlow(result, scope)

  const Node = ({ x, y, width, height: h, payload }: NodeProps) => {
    const n = payload as unknown as FlowNode & { value: number }
    const tx = x + width + 8
    return (
      <g>
        <rect x={x} y={y} width={width} height={Math.max(2, h)} rx={3} fill={n.color} />
        <text x={tx} y={y + h / 2 - 2} fontSize={12} fill="var(--text)" style={{ paintOrder: 'stroke', stroke: 'color-mix(in oklab, var(--bg) 70%, transparent)', strokeWidth: 3 }}>
          {n.name}
        </text>
        <text x={tx} y={y + h / 2 + 12} fontSize={11} fill="var(--muted)" className="num" style={{ paintOrder: 'stroke', stroke: 'color-mix(in oklab, var(--bg) 70%, transparent)', strokeWidth: 3 }}>
          {money(n.value)}
        </text>
      </g>
    )
  }

  const Link = (p: LinkProps) => {
    const src = p.payload.source as unknown as FlowNode
    const tgt = p.payload.target as unknown as FlowNode
    const gid = `flow-${p.index}`
    return (
      <g>
        <defs>
          <linearGradient id={gid} x1="0" x2="1">
            <stop offset="0" style={{ stopColor: src.color }} />
            <stop offset="1" style={{ stopColor: tgt.color }} />
          </linearGradient>
        </defs>
        <path
          d={`M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={Math.max(1, p.linkWidth)}
          strokeOpacity={0.34}
          className="transition-[stroke-opacity] hover:[stroke-opacity:0.5]"
        />
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey data={data} node={Node} link={Link} nodePadding={26} nodeWidth={8} iterations={64} margin={{ top: 12, right: 130, bottom: 12, left: 8 }} sort={false}>
        <Tooltip content={(p) => <ChartTooltip {...p} format={(v) => `${money(v)}/mo`} />} />
      </Sankey>
    </ResponsiveContainer>
  )
}
