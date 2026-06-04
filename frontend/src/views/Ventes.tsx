import React, { useState, useMemo } from 'react'
import { Printer, FileText } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Badge }  from '../components/Badge'
import { imprimerRecu, imprimerFactureA4 } from '../utils/impression'
import type { Vente } from '../types/pos'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

interface VentesProps { ventes: Vente[] }

const FILTRES = ['tous', 'payé', 'crédit', 'partiel', 'retard'] as const
type FiltreType = typeof FILTRES[number]

export function Ventes({ ventes }: VentesProps) {
  const [filtre, setFiltre]       = useState<FiltreType>('tous')
  const [recherche, setRecherche] = useState('')

  const ventesFiltrées = useMemo(() => {
    let r = [...ventes].sort((a, b) => b.date.getTime() - a.date.getTime())
    if (filtre !== 'tous') r = r.filter(v => v.statut === filtre)
    if (recherche.trim())  r = r.filter(v =>
      v.clientNom.toLowerCase().includes(recherche.toLowerCase()) ||
      v.dateStr.includes(recherche)
    )
    return r
  }, [ventes, filtre, recherche])

  const totalFiltré = useMemo(() => ventesFiltrées.reduce((s, v) => s + v.totalNet, 0), [ventesFiltrées])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar titre="Ventes" sous="Historique des transactions" recherche={recherche} setRecherche={setRecherche} showSearch />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTRES.map(f => (
            <button key={f} onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer transition-all
                ${filtre === f ? 'bg-[#ECC94B] text-[#1A365D]' : 'bg-[#2D3748] text-slate-300 hover:bg-[#4A5568] border border-[#4A5568]'}`}>
              {f === 'tous' ? 'Toutes' : f}
            </button>
          ))}
          <div className="ml-auto bg-[#2D3748] rounded-xl px-4 py-1.5 border border-[#4A5568]">
            <span className="text-slate-400 text-xs">Total filtré : </span>
            <span className="text-[#ECC94B] font-bold text-xs">{fmt(totalFiltré)} GNF</span>
          </div>
        </div>

        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 uppercase text-[10px] bg-[#1A365D]/60 border-b border-[#4A5568]">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Mode</th>
                  <th className="text-left px-4 py-3">Encaissé</th>
                  <th className="text-left px-4 py-3">Reste</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ventesFiltrées.map(v => (
                  <React.Fragment key={v.id}>
                    <tr className="border-b border-[#4A5568]/40 hover:bg-[#374151] transition-colors">
                      <td className="px-4 py-3 text-slate-400">{v.dateStr}</td>
                      <td className="px-4 py-3 text-white font-medium">{v.clientNom}</td>
                      <td className="px-4 py-3 text-[#ECC94B] font-bold">{fmt(v.totalNet)} GNF</td>
                      <td className="px-4 py-3 text-slate-300">{v.modeReglement}</td>
                      <td className="px-4 py-3 text-green-400 font-semibold">{fmt(v.montantEncaisse)} GNF</td>
                      <td className={`px-4 py-3 font-semibold ${v.resteAPayer > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        {fmt(v.resteAPayer)} GNF
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={v.statut === 'payé' ? 'green' : v.statut === 'crédit' ? 'blue' : v.statut === 'retard' ? 'red' : 'yellow'}>
                          {v.statut}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* Reçu thermique 80mm */}
                          <button
                            onClick={() => imprimerRecu(v)}
                            title="Imprimer reçu 80mm"
                            className="flex items-center gap-1 bg-[#1A365D] hover:bg-[#2A4A7F] text-white text-[10px] px-2 py-1 rounded-lg cursor-pointer transition-colors border border-[#2A4A7F]"
                          >
                            <Printer size={11} /> Reçu
                          </button>
                          {/* Facture A4 */}
                          <button
                            onClick={() => imprimerFactureA4(v)}
                            title="Imprimer facture A4"
                            className="flex items-center gap-1 bg-[#ECC94B] hover:bg-amber-500 text-[#1A365D] text-[10px] px-2 py-1 rounded-lg cursor-pointer transition-colors font-semibold"
                          >
                            <FileText size={11} /> Facture
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Détail lignes */}
                    {v.lignes.map((l, i) => (
                      <tr key={i} className="bg-[#1A365D]/20 border-b border-[#4A5568]/20">
                        <td colSpan={2} />
                        <td colSpan={6} className="px-4 py-1.5 text-slate-400 text-[11px]">
                          ↳ {l.produitNom} — {l.type} × {l.qte} @ {fmt(l.prixUnit)} GNF = <span className="text-[#ECC94B]">{fmt(l.total)} GNF</span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {ventesFiltrées.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">Aucune vente trouvée</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Ventes
