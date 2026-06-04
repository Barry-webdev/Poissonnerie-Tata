// frontend/src/components/StatsFooter.tsx
import React, { useMemo } from 'react'
import { TrendingUp, Package, AlertTriangle } from 'lucide-react'
import type { StatsFooterProps } from '../types/pos'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

export function StatsFooter({ produits, ventes }: StatsFooterProps) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const ventesJour = ventes.filter(v => v.dateStr === today)
    const caisse = ventesJour
      .filter(v => v.modeReglement !== 'Crédit')
      .reduce((s, v) => s + v.montantEncaisse, 0)

    // Marge estimée = totalNet - (pampCart * qteCarton vendus)
    const margeEstimee = ventesJour.reduce((s, v) =>
      s + v.lignes.reduce((ls, l) => {
        const produit = produits.find(p => p.id === l.produitId)
        if (!produit) return ls
        const cout = l.type === 'Carton'
          ? l.qte * produit.pampCart
          : l.qte * (produit.pampCart / produit.kgParCarton)
        return ls + (l.total - cout)
      }, 0), 0)

    const stockTotal = produits.reduce((s, p) => s + p.stockKg, 0)
    const alertes    = produits.filter(p => p.stockCart <= p.seuilAlerte).length

    return { caisse, nbVentes: ventesJour.length, margeEstimee, stockTotal, alertes }
  }, [produits, ventes])

  const items = [
    {
      icon:  TrendingUp,
      label: 'Caisse du jour',
      value: `${fmt(stats.caisse)} GNF`,
      sub:   `${stats.nbVentes} vente(s)`,
      color: 'text-green-400',
      bg:    'bg-green-900/30 border-green-700/30',
    },
    {
      icon:  TrendingUp,
      label: 'Marge estimée',
      value: `${fmt(stats.margeEstimee)} GNF`,
      sub:   'PAMP déduit',
      color: 'text-blue-400',
      bg:    'bg-blue-900/20 border-blue-700/20',
    },
    {
      icon:  Package,
      label: 'Stock total',
      value: `${fmt(stats.stockTotal)} Kg`,
      sub:   `${produits.length} références`,
      color: 'text-cyan-400',
      bg:    'bg-cyan-900/20 border-cyan-700/20',
    },
    {
      icon:  AlertTriangle,
      label: 'Alertes stock',
      value: `${stats.alertes} produit(s)`,
      sub:   '≤ seuil alerte',
      color: stats.alertes > 0 ? 'text-[#ECC94B]' : 'text-slate-400',
      bg:    stats.alertes > 0 ? 'bg-yellow-900/20 border-yellow-700/20' : 'bg-[#2D3748] border-[#4A5568]',
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 px-5 py-3 border-t border-[#4A5568] bg-[#1A365D]/40 shrink-0">
      {items.map(item => (
        <div key={item.label} className={`rounded-xl p-3 border flex items-center gap-2 ${item.bg}`}>
          <item.icon size={16} className={item.color} />
          <div className="min-w-0">
            <p className="text-slate-400 text-[10px]">{item.label}</p>
            <p className={`font-extrabold text-xs truncate ${item.color}`}>{item.value}</p>
            <p className="text-slate-500 text-[10px]">{item.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsFooter
