// frontend/src/views/Caisse.tsx
import React, { useMemo } from 'react'
import { Wallet, Banknote, CreditCard, TrendingUp } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Badge } from '../components/Badge'
import type { Vente } from '../types/pos'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

interface CaisseProps {
  ventes: Vente[]
}

export function Caisse({ ventes }: CaisseProps) {
  const today = new Date().toISOString().slice(0, 10)
  const dateAffichee = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  // Exigences 7.1, 7.2, 7.3, 7.4 - CAISSE DU JOUR
  const { ventesJour, especes, virement, credit, caisseJour } = useMemo(() => {
    const ventesJour = ventes.filter(v => v.dateStr === today)
    const especes    = ventesJour.filter(v => v.modeReglement === 'Espèces').reduce((s, v) => s + v.montantEncaisse, 0)
    const virement   = ventesJour.filter(v => v.modeReglement === 'Virement').reduce((s, v) => s + v.montantEncaisse, 0)
    
    // CORRECTION : Calculer le total des restes à payer (peu importe le mode de règlement)
    const credit = ventesJour.reduce((s, v) => s + v.resteAPayer, 0)
    
    // Exigence 7.1 : caisse = espèces + virement UNIQUEMENT (hors crédit)
    const caisseJour = especes + virement
    return { ventesJour, especes, virement, credit, caisseJour }
  }, [ventes, today])

  // TOTAL CUMULÉ DEPUIS LE DÉBUT
  const { totalCumule, especesCumul, virementCumul, creditCumul, caisseTotale } = useMemo(() => {
    const especesCumul  = ventes.filter(v => v.modeReglement === 'Espèces').reduce((s, v) => s + v.montantEncaisse, 0)
    const virementCumul = ventes.filter(v => v.modeReglement === 'Virement').reduce((s, v) => s + v.montantEncaisse, 0)
    const creditCumul   = ventes.reduce((s, v) => s + v.resteAPayer, 0)
    const caisseTotale  = especesCumul + virementCumul
    const totalCumule   = ventes.reduce((s, v) => s + v.totalNet, 0)
    
    return { totalCumule, especesCumul, virementCumul, creditCumul, caisseTotale }
  }, [ventes])

  const kpiCards = [
    {
      icon:  Wallet,
      label: 'Total Caisse Physique',
      value: caisseJour,
      cls:   'text-green-400',
      bg:    'bg-green-900/30 border-green-700/30',
    },
    {
      icon:  Banknote,
      label: 'Espèces',
      value: especes,
      cls:   'text-white',
      bg:    'bg-[#2D3748] border-[#4A5568]',
    },
    {
      icon:  TrendingUp,
      label: 'Virement',
      value: virement,
      cls:   'text-blue-400',
      bg:    'bg-blue-900/20 border-blue-700/20',
    },
    {
      icon:  CreditCard,
      label: 'En Crédit (hors caisse)',
      value: credit,
      cls:   'text-[#ECC94B]',
      bg:    'bg-yellow-900/20 border-yellow-700/20',
    },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        titre="Caisse Journalière"
        sous={`Clôture du ${dateAffichee}`}
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* SECTION : TOTAUX CUMULÉS */}
        <div className="bg-gradient-to-r from-[#1A365D] to-[#2D3748] rounded-xl border-2 border-[#ECC94B]/50 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-[#ECC94B]" />
            <h2 className="text-white font-extrabold text-base">Totaux Cumulés (Depuis le début)</h2>
          </div>
          
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-[#2D3748]/60 rounded-lg p-3 border border-[#4A5568]">
              <p className="text-slate-400 text-[10px] mb-1">CHIFFRE D'AFFAIRES TOTAL</p>
              <p className="text-white font-extrabold text-lg">{fmt(totalCumule)}</p>
              <p className="text-slate-500 text-[9px]">GNF · {ventes.length} ventes</p>
            </div>
            
            <div className="bg-green-900/20 rounded-lg p-3 border border-green-700/30">
              <p className="text-slate-400 text-[10px] mb-1">CAISSE TOTALE</p>
              <p className="text-green-400 font-extrabold text-lg">{fmt(caisseTotale)}</p>
              <p className="text-slate-500 text-[9px]">Espèces + Virement</p>
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-700/30">
              <p className="text-slate-400 text-[10px] mb-1">VIREMENT TOTAL</p>
              <p className="text-blue-400 font-extrabold text-lg">{fmt(virementCumul)}</p>
              <p className="text-slate-500 text-[9px]">GNF</p>
            </div>
            
            <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-700/30">
              <p className="text-slate-400 text-[10px] mb-1">CRÉDIT EN COURS TOTAL</p>
              <p className="text-[#ECC94B] font-extrabold text-lg">{fmt(creditCumul)}</p>
              <p className="text-slate-500 text-[9px]">À encaisser</p>
            </div>
          </div>
        </div>

        {/* SECTION : CAISSE DU JOUR */}
        <div className="border-t-2 border-[#4A5568]/50 pt-4">
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Wallet size={16} className="text-green-400" />
            Caisse du Jour ({dateAffichee})
          </h2>
        
        {/* KPI caisse */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">{kpiCards.map(k => (
            <div key={k.label} className={`rounded-xl p-4 border ${k.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <k.icon size={16} className={k.cls} />
                <p className="text-slate-400 text-xs">{k.label}</p>
              </div>
              <p className={`font-extrabold text-xl ${k.cls}`}>{fmt(k.value)}</p>
              <p className="text-slate-500 text-[10px]">GNF</p>
            </div>
          ))}
        </div>

        {/* Résumé par mode */}
        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Récapitulatif par Mode de Règlement</h3>
          <div className="space-y-2">
            {[
              { label: 'Espèces', val: especes, count: ventesJour.filter(v => v.modeReglement === 'Espèces').length },
              { label: 'Virement', val: virement, count: ventesJour.filter(v => v.modeReglement === 'Virement').length },
              { label: 'Crédit', val: credit, count: ventesJour.filter(v => v.modeReglement === 'Crédit').length },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#4A5568]/40 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-medium w-20">{item.label}</span>
                  <Badge color="slate">{item.count} vente(s)</Badge>
                </div>
                <span className={`font-bold text-sm ${item.label === 'Crédit' ? 'text-[#ECC94B]' : 'text-green-400'}`}>
                  {fmt(item.val)} GNF
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Liste transactions du jour — Exigence 7.3 */}
        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#4A5568] flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">
              Transactions du Jour — {ventesJour.length} vente(s)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 uppercase text-[10px] bg-[#1A365D]/60 border-b border-[#4A5568]">
                  <th className="text-left px-4 py-3 font-semibold">Client</th>
                  <th className="text-left px-4 py-3 font-semibold">Total</th>
                  <th className="text-left px-4 py-3 font-semibold">Mode</th>
                  <th className="text-left px-4 py-3 font-semibold">Encaissé</th>
                  <th className="text-left px-4 py-3 font-semibold">Reste</th>
                  <th className="text-left px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {ventesJour.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">
                      Aucune transaction aujourd'hui
                    </td>
                  </tr>
                ) : (
                  ventesJour.map(v => (
                    <tr key={v.id} className="border-b border-[#4A5568]/40 hover:bg-[#374151] transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{v.clientNom}</td>
                      <td className="px-4 py-3 text-[#ECC94B] font-bold">{fmt(v.totalNet)} GNF</td>
                      <td className="px-4 py-3 text-slate-300">{v.modeReglement}</td>
                      <td className="px-4 py-3 text-green-400">{fmt(v.montantEncaisse)} GNF</td>
                      <td className={`px-4 py-3 font-semibold ${v.resteAPayer > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        {fmt(v.resteAPayer)} GNF
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={v.statut === 'payé' ? 'green' : v.statut === 'crédit' ? 'blue' : 'red'}>
                          {v.statut}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
        {/* FIN SECTION DU JOUR */}
      </div>
    </div>
  )
}

export default Caisse
