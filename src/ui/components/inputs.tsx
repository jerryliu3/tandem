import { Check, ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { Select, Slider, Switch as SwitchPrimitive } from 'radix-ui'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { Currency } from '../../model/types'
import { cn } from '../cn'
import { formatNumber } from '../format'

/** Parses "120k", "1.2m", "$3,400", "15%" → number. */
export function parseNumberInput(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/[$,\s%]|c\$/g, '').replace('−', '-')
  if (s === '' || s === '-') return null
  const m = s.match(/^(-?\d*\.?\d+)([km]?)$/)
  if (!m) return null
  const n = Number(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1)
  return Number.isFinite(n) ? n : null
}

export function EditableNumber({
  value,
  onChange,
  prefix,
  suffix,
  decimals = 0,
  min,
  max,
  step = 1,
  className,
  ariaLabel,
  size = 'md',
  placeholder,
  grouping = true,
}: {
  value: number | null
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  decimals?: number
  min?: number
  max?: number
  step?: number
  className?: string
  ariaLabel?: string
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
  /** Thousands separators (off for years). */
  grouping?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const clampV = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))
  const commit = () => {
    const parsed = parseNumberInput(draft)
    if (parsed !== null) {
      const factor = 10 ** decimals
      const v = clampV(Math.round(parsed * factor) / factor)
      if (v !== value) onChange(v)
    }
    setEditing(false)
  }
  const sizeCls = size === 'lg' ? 'text-2xl font-semibold' : size === 'sm' ? 'text-xs' : 'text-sm'

  if (editing) {
    return (
      <span className={cn('inline-flex items-center rounded-lg bg-surface-2 px-2 py-1 ring-1 ring-accent/50', sizeCls, className)}>
        {prefix && <span className="mr-0.5 text-muted">{prefix}</span>}
        <input
          ref={inputRef}
          autoFocus
          value={draft}
          inputMode="decimal"
          aria-label={ariaLabel}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') setEditing(false)
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const cur = parseNumberInput(draft) ?? value ?? 0
              const next = clampV(cur + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1))
              setDraft(String(Math.round(next * 10 ** decimals) / 10 ** decimals))
            }
          }}
          className="num w-24 min-w-0 bg-transparent text-right outline-none"
          style={{ width: `${Math.max(4, draft.length + 1)}ch` }}
        />
        {suffix && <span className="ml-0.5 text-muted">{suffix}</span>}
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() => {
        setDraft(value === null ? '' : String(value))
        setEditing(true)
      }}
      className={cn(
        'num group inline-flex items-center rounded-lg px-2 py-1 text-right transition-colors hover:bg-surface-2',
        value === null && 'text-faint',
        sizeCls,
        className,
      )}
    >
      {value === null ? (
        placeholder ?? 'Add'
      ) : (
        <>
          {prefix && <span className="mr-0.5 text-muted">{prefix}</span>}
          <span className="border-b border-dashed border-transparent group-hover:border-faint">{grouping ? formatNumber(value, decimals) : value.toFixed(decimals)}</span>
          {suffix && <span className="ml-0.5 text-muted">{suffix}</span>}
        </>
      )}
    </button>
  )
}

export function EditableText({ value, onChange, className, placeholder = 'Untitled' }: { value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  const [draft, setDraft] = useState(value)
  const [synced, setSynced] = useState(value)
  const cancelled = useRef(false)
  if (value !== synced) {
    setSynced(value)
    setDraft(value)
  }
  return (
    <input
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (cancelled.current) {
          cancelled.current = false
          setDraft(value)
        } else if (draft.trim() !== value) onChange(draft.trim() || placeholder)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancelled.current = true
          e.currentTarget.blur()
        }
      }}
      className={cn('min-w-0 rounded-lg bg-transparent px-2 py-1 text-sm outline-none transition-colors hover:bg-surface-2 focus:bg-surface-2 focus:ring-1 focus:ring-accent/50', className)}
    />
  )
}

export const CURRENCY_PREFIX: Record<Currency, string> = { USD: '$', CAD: 'C$' }

export function CurrencyPill({ value, onChange }: { value: Currency; onChange?: (c: Currency) => void }) {
  return (
    <button
      type="button"
      disabled={!onChange}
      onClick={() => onChange?.(value === 'USD' ? 'CAD' : 'USD')}
      title={onChange ? 'Switch currency' : undefined}
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wider',
        value === 'CAD' ? 'bg-negative/15 text-negative' : 'bg-accent/15 text-accent',
        onChange && 'transition-opacity hover:opacity-80',
      )}
    >
      {value}
    </button>
  )
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-b border-line py-2 last:border-0', className)}>
      <div className="min-w-0">
        <div className="text-sm text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-faint">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </div>
  )
}

export function MoneyField({
  label,
  hint,
  value,
  onChange,
  currency = 'USD',
  onCurrencyChange,
  suffix,
  decimals = 0,
  min = 0,
  max,
  step = 100,
  placeholder,
  showCurrency,
}: {
  label: ReactNode
  hint?: ReactNode
  value: number | null
  onChange: (v: number) => void
  currency?: Currency
  onCurrencyChange?: (c: Currency) => void
  /** Defaults to showing the pill for CAD or when the currency is switchable. */
  showCurrency?: boolean
  suffix?: string
  decimals?: number
  min?: number
  max?: number
  step?: number
  placeholder?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <EditableNumber value={value} onChange={onChange} prefix={CURRENCY_PREFIX[currency]} suffix={suffix} decimals={decimals} min={min} max={max} step={step} placeholder={placeholder} ariaLabel={typeof label === 'string' ? label : undefined} />
      {(showCurrency ?? (onCurrencyChange || currency === 'CAD')) && <CurrencyPill value={currency} onChange={onCurrencyChange} />}
    </Field>
  )
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  suffix,
  prefix,
  decimals = 0,
  min,
  max,
  step = 1,
  grouping,
}: {
  label: ReactNode
  hint?: ReactNode
  value: number
  onChange: (v: number) => void
  suffix?: string
  prefix?: string
  decimals?: number
  min?: number
  max?: number
  step?: number
  grouping?: boolean
}) {
  return (
    <Field label={label} hint={hint}>
      <EditableNumber value={value} onChange={onChange} suffix={suffix} prefix={prefix} decimals={decimals} min={min} max={max} step={step} grouping={grouping} ariaLabel={typeof label === 'string' ? label : undefined} />
    </Field>
  )
}

export function SliderField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  decimals = 0,
  display,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  prefix?: string
  suffix?: string
  decimals?: number
  /** Replace the editable value with custom content (e.g. a formatted amount). */
  display?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('py-2', className)}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-ink">{label}</div>
          {hint && <div className="text-xs text-faint">{hint}</div>}
        </div>
        {display ?? <EditableNumber value={value} onChange={onChange} prefix={prefix} suffix={suffix} decimals={decimals} min={min} max={max} step={step} ariaLabel={typeof label === 'string' ? label : undefined} />}
      </div>
      <Slider.Root
        value={[Math.min(max, Math.max(min, value))]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="relative flex h-5 w-full touch-none items-center select-none"
      >
        <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-track">
          <Slider.Range className="bg-accent-gradient absolute h-full rounded-full" />
        </Slider.Track>
        <Slider.Thumb
          aria-label={typeof label === 'string' ? label : 'Value'}
          className="block size-4 cursor-grab rounded-full border-2 border-white bg-[var(--accent)] shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_25%,transparent)] transition-shadow outline-none hover:shadow-[0_0_0_6px_color-mix(in_oklab,var(--accent)_30%,transparent)] active:cursor-grabbing"
        />
      </Slider.Root>
    </div>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: {
  options: { value: T; label: ReactNode; title?: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const id = useId()
  return (
    <div role="radiogroup" className={cn('inline-flex rounded-xl border border-line bg-surface p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative rounded-[10px] font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
              active ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-[10px] border border-line bg-surface-2 shadow-sm"
                transition={{ type: 'spring', bounce: 0.18, duration: 0.42 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="relative h-[22px] w-10 shrink-0 rounded-full border border-line bg-track transition-colors data-[state=checked]:border-transparent data-[state=checked]:bg-[var(--accent)]"
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-[3px] rounded-full bg-white shadow transition-transform duration-200 data-[state=checked]:translate-x-[19px]" />
    </SwitchPrimitive.Root>
  )
}

export function SelectMenu<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; icon?: ReactNode }[]
  className?: string
  ariaLabel?: string
}) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-ink transition-colors outline-none hover:bg-surface-2 data-[state=open]:bg-surface-2', className)}
      >
        <Select.Value />
        <Select.Icon className="text-faint">
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={6} collisionPadding={12} className="popover-surface anim-pop z-50 max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl p-1">
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="relative flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-8 pl-2.5 text-sm text-ink outline-none select-none data-[highlighted]:bg-surface-2"
              >
                <Select.ItemText>
                  <span className="inline-flex items-center gap-2">
                    {o.icon}
                    {o.label}
                  </span>
                </Select.ItemText>
                <Select.ItemIndicator className="absolute right-2 text-accent">
                  <Check size={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  size = 'md',
  className,
  title,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md'
  className?: string
  title?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-all disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
        variant === 'primary' && 'bg-accent-gradient text-white shadow-[0_8px_24px_-10px_var(--accent)] hover:brightness-110',
        variant === 'ghost' && 'text-muted hover:bg-surface-2 hover:text-ink',
        variant === 'outline' && 'border border-line bg-surface text-ink hover:bg-surface-2',
        variant === 'danger' && 'text-negative hover:bg-negative/10',
        className,
      )}
    >
      {children}
    </button>
  )
}
