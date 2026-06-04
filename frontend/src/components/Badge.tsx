// frontend/src/components/Badge.tsx
import React from 'react'

type BadgeColor = 'green' | 'red' | 'yellow' | 'slate' | 'blue' | 'orange'

interface BadgeProps {
  children: React.ReactNode
  color?:   BadgeColor
}

const colorMap: Record<BadgeColor, string> = {
  green:  'bg-green-900/40 text-green-400 border border-green-700/40',
  red:    'bg-red-900/40 text-red-400 border border-red-700/40',
  yellow: 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40',
  slate:  'bg-slate-700/40 text-slate-300 border border-slate-600/40',
  blue:   'bg-blue-900/40 text-blue-400 border border-blue-700/40',
  orange: 'bg-orange-900/40 text-orange-400 border border-orange-700/40',
}

export function Badge({ children, color = 'slate' }: BadgeProps) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colorMap[color]}`}>
      {children}
    </span>
  )
}

export default Badge
