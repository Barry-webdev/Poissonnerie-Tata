// frontend/src/views/Dashboard.tsx
import React, { useMemo } from 'react'
import {
  Wallet, TrendingUp, Users, Snowflake, AlertTriangle,
} from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { StatsFooter } from '../components/StatsFooter'
import { Badge } from '../components/Badge'
import type { Produit, Vente, Client } from '../types/pos'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

interface DashboardProps {
  produits: Produit[]
  ventes:   Vente[]
  clients:  Client[]
}

export function Dashboard({ produits, ventes, clients }: DashboardProps) {
  // Exigences 1.1 à 1.6 — KPI calculés côté service/vue
  const kpi = useMemo(() => {
    const today       = new Date().toISOString().slice(0, 10)
    const ventesJour  = ventes.filter(v => v.dateStr === today)

    // Exigence 1.1 : caisse = sum(montantEncaisse) où modeReglement != 'Crédit'
    const caisseJour  = ventesJour
      .filter(v => v.modeReglement !== 'Crédit')
      .reduce((s, v) => s + v.montantEncaisse, 0)

    // Exigence 1.2 : marge estimée
    const margeEstimee = ventesJour.reduce((s, v) =>
      s + v.lignes.reduce((ls, l) => {
        const p = produits.find(x => x.id === l.produitId)
        if (!p) return ls
        const cout = l.type === 'Carton'
          ? l.qte * p.pampCart
          : l.qte * (p.pampCart / p.kgParCarton)
        return ls + (l.total - cout)
      }, 0), 0)

    // Exigence 1.3 : crédits actifs
    const clientsRetard    = clients.filter(c => c.statut === 'retard' || c.statut === 'bloque')
    const creditsMontant   = clientsRetard.reduce((s, c) => s + c.creditEnCours, 0)

    // Exigence 1.4 : alertes stock
    const alertesStock = produits.filter(p => p.stockCart <= p.seuilAlerte).length

    return {
      caisseJour,
      nbVentesJour: ventesJour.length,
      margeEstimee,
      creditsActifs: clientsRetard.length,
      creditsMontant,
      alertesStock,
    }
  }, [ventes, produits, clients])

  const alertCount = kpi.alertesStock

  const kpiCards = [
    {
      icon:  Wallet,
      label: 'Caisse du Jour',
      value: `${fmt(kpi.caisseJour)} GNF`,
      sub:   `${kpi.nbVentesJour} transaction(s)`,
      cls:   'bg-green-900/40 text-green-400',
    },
    {
      icon:  TrendingUp,
      label: 'Marge Estimée',
      value: `${fmt(kpi.margeEstimee)} GNF`,
      sub:   `${kpi.nbVentesJour} vente(s) aujourd'hui`,
      cls:   'bg-blue-900/40 text-blue-400',
    },
    {
      icon:  Users,
      label: 'Balance Crédits',
      value: `${kpi.creditsActifs} en retard`,
      sub:   `${fmt(kpi.creditsMontant)} GNF en cours`,
      cls:   'bg-yellow-900/40 text-[#ECC94B]',
    },
    {
      icon:  Snowflake,
      label: 'Stock Total',
      value: `${fmt(produits.reduce((s, p) => s + p.stockKg, 0))} Kg`,
      sub:   `${produits.length} références`,
      cls:   'bg-cyan-900/40 text-cyan-400',
    },
  ]

  // Exigence 1.5 : ventes triées par date décroissante
  const dernieresVentes = useMemo(
    () => [...ventes].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5),
    [ventes]
  )

  // Exigence 1.6 : produits en alerte
  const alertesProduits = produits.filter(p => p.stockCart <= p.seuilAlerte)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        titre="Dashboard"
        sous="Vue d'ensemble de l'activité"
        alertCount={alertCount}
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {kpiCards.map(k => (
            <div key={k.label} className="bg-[#2D3748] rounded-xl p-4 flex items-center gap-3 border border-[#4A5568]">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.cls}`}>
                <k.icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-slate-400 text-[11px]">{k.label}</p>
                <p className="text-white font-extrabold text-sm truncate">{k.value}</p>
                <p className="text-slate-500 text-[10px]">{k.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dernières ventes — Exigence 1.5 */}
        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#4A5568] flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Dernières Ventes</h3>
            <Badge color="blue">{ventes.length} total</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 uppercase text-[10px] border-b border-[#4A5568] bg-[#1A365D]/40">
                  <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Client</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Total</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Mode</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {dernieresVentes.map(v => (
                  <tr key={v.id} className="border-b border-[#4A5568]/50 hover:bg-[#374151] transition-colors">
                    <td className="px-4 py-2.5 text-slate-400">{v.dateStr}</td>
                    <td className="px-4 py-2.5 text-white font-medium">{v.clientNom}</td>
                    <td className="px-4 py-2.5 text-[#ECC94B] font-bold">{fmt(v.totalNet)} GNF</td>
                    <td className="px-4 py-2.5 text-slate-300">{v.modeReglement}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={
                        v.statut === 'payé'   ? 'green' :
                        v.statut === 'crédit' ? 'blue'  :
                        v.statut === 'retard' ? 'red'   : 'yellow'
                      }>
                        {v.statut}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertes stock critique — Exigence 1.6 */}
        {alertesProduits.length > 0 && (
          <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#4A5568]">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#ECC94B]" />
                Alertes Stock Critique
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {alertesProduits.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-red-950/30 border border-red-700/30 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.emoji}</span>
                    <div>
                      <p className="text-white text-xs font-semibold">{p.nom}</p>
                      <p className="text-slate-400 text-[10px]">{p.categorie}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-xs font-bold">{p.stockCart} Cart restants</span>
                    <Badge color="red">RUPTURE</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balance crédits */}
        {kpi.creditsActifs > 0 && (
          <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#4A5568]">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Users size={14} className="text-[#ECC94B]" />
                Clients en Crédit / Retard
              </h3>
            </div>
            <div className="divide-y divide-[#4A5568]/40">
              {clients.filter(c => c.statut !== 'actif').map(c => {
                const pct = Math.min(100, Math.round((c.creditEnCours / c.plafondCredit) * 100))
                return (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold">{c.nom}</p>
                      <p className="text-slate-400 text-[10px]">{c.telephone}</p>
                    </div>
                    <div className="text-right mr-3">
                      <p className="text-[#ECC94B] font-bold text-xs">{fmt(c.creditEnCours)} GNF</p>
                      <p className="text-slate-400 text-[10px]">/ {fmt(c.plafondCredit)}</p>
                    </div>
                    <div className="w-20">
                      <div className="bg-[#1A365D] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-[#ECC94B]' : 'bg-green-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-slate-500 text-[9px] text-right mt-0.5">{pct}%</p>
                    </div>
                    <Badge color={c.statut === 'bloque' ? 'red' : 'yellow'}>{c.statut}</Badge>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <StatsFooter produits={produits} ventes={ventes} />
    </div>
  )
}

export default Dashboard
