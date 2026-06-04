// frontend/src/components/Topbar.tsx
import React, { useState, useEffect } from 'react'
import { Bell, Clock, Search } from 'lucide-react'
import type { TopbarProps } from '../types/pos'

export function Topbar({
  titre,
  sous,
  recherche,
  setRecherche,
  showSearch = false,
  alertCount = 0,
}: TopbarProps) {
  const [now, setNow] = useState(new Date())

  // Horloge temps réel
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const dateStr = now.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day:     '2-digit',
    month:   'short',
  })

  return (
    <header className="bg-[#1A365D] border-b border-[#2A4A7F] px-5 py-3 flex items-center justify-between shrink-0 gap-4">
      <div className="min-w-0">
        <h1 className="text-white font-bold text-base leading-tight">{titre}</h1>
        {sous && <p className="text-slate-400 text-xs">{sous}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Barre de recherche conditionnelle */}
        {showSearch && setRecherche && (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={recherche ?? ''}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher..."
              className="bg-[#2A4A7F] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs pl-8 pr-3 py-1.5 rounded-xl outline-none placeholder:text-slate-400 w-44 transition-colors"
            />
          </div>
        )}

        {/* Cloche avec badge alertes — Exigence 15.5 */}
        <div className="relative">
          <button className="w-8 h-8 bg-[#2A4A7F] hover:bg-[#4A5568] rounded-xl flex items-center justify-center cursor-pointer transition-colors">
            <Bell size={14} className="text-slate-300" />
          </button>
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ECC94B] rounded-full text-[9px] font-bold text-[#1A365D] flex items-center justify-center pointer-events-none">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </div>

        {/* Date courante */}
        <div className="flex items-center gap-1.5 bg-[#2A4A7F] px-2.5 py-1.5 rounded-xl">
          <Clock size={12} className="text-[#ECC94B]" />
          <span className="text-slate-300 text-[11px] font-medium whitespace-nowrap">
            {dateStr}
          </span>
        </div>
      </div>
    </header>
  )
}

export default Topbar
