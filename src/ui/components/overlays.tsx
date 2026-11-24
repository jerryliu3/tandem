import { Info, X } from 'lucide-react'
import { AlertDialog, Dialog, Popover } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '../cn'

export interface ExplainLine {
  label: string
  value: string
  kind?: 'add' | 'sub' | 'total' | 'note'
}

export function Explain({ title, lines, note, className }: { title: string; lines: ExplainLine[]; note?: ReactNode; className?: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn('inline-flex size-5 items-center justify-center rounded-full text-faint transition-colors hover:bg-surface-2 hover:text-ink', className)}
        aria-label={`How ${title} is calculated`}
      >
        <Info size={13} strokeWidth={2} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="start" sideOffset={8} collisionPadding={16} className="popover-surface anim-pop z-50 w-80 rounded-2xl p-4 text-sm">
          <div className="mb-2.5 text-xs font-semibold tracking-wide text-muted uppercase">{title}</div>
          <div className="space-y-1.5">
            {lines.map((l, i) =>
              l.kind === 'note' ? (
                <p key={i} className="pt-1 text-xs leading-relaxed text-faint">
                  {l.label}
                </p>
              ) : (
                <div key={i} className={cn('flex items-baseline justify-between gap-4', l.kind === 'total' && 'mt-2 border-t border-line pt-2 font-semibold')}>
                  <span className={cn(l.kind === 'total' ? 'text-ink' : 'text-muted')}>{l.label}</span>
                  <span className="num shrink-0 text-ink">
                    {l.kind === 'sub' ? '− ' : l.kind === 'add' ? '+ ' : ''}
                    {l.value}
                  </span>
                </div>
              ),
            )}
          </div>
          {note && <div className="mt-3 text-xs leading-relaxed text-faint">{note}</div>}
          <Popover.Arrow className="fill-[var(--surface-2)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 'w-[480px]',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  width?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="anim-fade fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />
        <Dialog.Content className={cn('anim-drawer popover-surface fixed top-0 right-0 z-50 flex h-full max-w-[94vw] flex-col border-l border-line', width)}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description> : <Dialog.Description className="sr-only">Edit details</Dialog.Description>}
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-ink" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
}: {
  trigger: ReactNode
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  destructive?: boolean
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="anim-fade fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />
        <AlertDialog.Content className="popover-surface anim-pop fixed top-1/2 left-1/2 z-50 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6">
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel className="rounded-xl px-4 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink">Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className={cn('rounded-xl px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90', destructive ? 'bg-negative' : 'bg-accent-gradient')}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
