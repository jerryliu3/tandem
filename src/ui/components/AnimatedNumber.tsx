import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { cn } from '../cn'

export function AnimatedNumber({ value, format, className }: { value: number; format: (v: number) => string; className?: string }) {
  const mv = useMotionValue(value)
  const [display, setDisplay] = useState(value)
  const reduce = useReducedMotion()
  useMotionValueEvent(mv, 'change', setDisplay)

  useEffect(() => {
    if (reduce || !Number.isFinite(value)) {
      mv.set(value)
      return
    }
    const controls = animate(mv, value, { duration: 0.55, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [value, reduce, mv])

  return <span className={cn('num', className)}>{format(Number.isFinite(value) ? display : value)}</span>
}
