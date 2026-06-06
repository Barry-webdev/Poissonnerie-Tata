import React, { useState, useMemo } from 'react'
import { FileText, Printer, TrendingUp, Wallet, Users, Snowflake, FileDown, TableProperties, BookText } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Badge }  from '../components/Badge'
import type { Produit, Vente, Client } from '../types/pos'
import logoTata from '../assets/logo.jpeg'
import {
  exportPDFCaisse, exportPDFVentes, exportPDFCredits, exportPDFInventaire,
  exportExcelCaisse, exportExcelVentes, exportExcelCredits, exportExcelInventaire,
  exportWordCaisse, exportWordVentes, exportWordCredits, exportWordInventaire,
} from '../utils/exportService'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

interface RapportsProps {
  produits: Produit[]
  ventes:   Vente[]
  clients:  Client[]
}

type OngletType = 'caisse' | 'ventes' | 'credits' | 'inventaire'

export function Rapports({ produits, ventes, clients }: RapportsProps) {
  const [onglet, setOnglet] = useState<OngletType>('caisse')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin,   setDateFin]   = useState('')

  const today = new Date().toISOString().slice(0, 10)

  // Filtre les ventes par date
  const ventesFiltrees = useMemo(() => {
    let v = [...ventes]
    if (dateDebut) v = v.filter(x => x.dateStr >= dateDebut)
    if (dateFin)   v = v.filter(x => x.dateStr <= dateFin)
    return v.sort((a, b) => b.dateStr.localeCompare(a.dateStr))
  }, [ventes, dateDebut, dateFin])

  // ── Rapport 1 : Caisse Journalière ───────────────────────────
  const rapportCaisse = useMemo(() => {
    const ventesJour = ventes.filter(v => v.dateStr === today)
    const especes    = ventesJour.filter(v => v.modeReglement === 'Espèces').reduce((s, v) => s + v.montantEncaisse, 0)
    const virement   = ventesJour.filter(v => v.modeReglement === 'Virement').reduce((s, v) => s + v.montantEncaisse, 0)
    const credit     = ventesJour.filter(v => v.modeReglement === 'Crédit').reduce((s, v) => s + v.totalNet, 0)
    return { especes, virement, credit, total: especes + virement, count: ventesJour.length, ventesJour }
  }, [ventes, today])

  // ── Rapport 2 : Analytique Ventes ────────────────────────────
  const rapportVentes = useMemo(() => {
    const ca = ventesFiltrees.reduce((s, v) => s + v.totalNet, 0)
    const marge = ventesFiltrees.reduce((s, v) =>
      s + v.lignes.reduce((ls, l) => {
        const p = produits.find(x => x.id === l.produitId)
        if (!p) return ls
        const cout = l.type === 'Carton' ? l.qte * p.pampCart : l.qte * (p.pampCart / p.kgParCarton)
        return ls + (l.total - cout)
      }, 0), 0)

    // Top produits
    const prodMap = new Map<string, { nom: string; qte: number; ca: number }>()
    ventesFiltrees.forEach(v => v.lignes.forEach(l => {
      const cur = prodMap.get(l.produitId) ?? { nom: l.produitNom, qte: 0, ca: 0 }
      prodMap.set(l.produitId, { nom: l.produitNom, qte: cur.qte + l.qte, ca: cur.ca + l.total })
    }))
    const topProduits = Array.from(prodMap.values()).sort((a, b) => b.ca - a.ca).slice(0, 5)

    // Par mode
    const parMode = {
      especes:  ventesFiltrees.filter(v => v.modeReglement === 'Espèces').reduce((s, v) => s + v.totalNet, 0),
      virement: ventesFiltrees.filter(v => v.modeReglement === 'Virement').reduce((s, v) => s + v.totalNet, 0),
      credit:   ventesFiltrees.filter(v => v.modeReglement === 'Crédit').reduce((s, v) => s + v.totalNet, 0),
    }

    return { ca, marge, topProduits, parMode, count: ventesFiltrees.length }
  }, [ventesFiltrees, produits])

  // ── Rapport 3 : Balance Âgée Crédits ─────────────────────────
  const rapportCredits = useMemo(() => {
    const enRetard = clients.filter(c => c.statut !== 'actif')
    const total    = enRetard.reduce((s, c) => s + c.creditEnCours, 0)
    const bloques  = clients.filter(c => c.statut === 'bloque').length
    return { enRetard, total, bloques }
  }, [clients])

  // ── Rapport 4 : Inventaire Frigo ─────────────────────────────
  const rapportInventaire = useMemo(() => {
    const valorisation = produits.reduce((s, p) => s + p.stockCart * p.pampCart, 0)
    const alertes      = produits.filter(p => p.stockCart <= p.seuilAlerte)
    const stockKgTotal = produits.reduce((s, p) => s + p.stockKg, 0)
    return { valorisation, alertes, stockKgTotal, produits: [...produits].sort((a, b) => a.stockCart - b.stockCart) }
  }, [produits])

  // ── Impression rapport ────────────────────────────────────────
  const imprimerRapport = () => {
    window.print()
  }

  // ── Exports PDF ───────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (onglet === 'caisse')
      await exportPDFCaisse(rapportCaisse.ventesJour, rapportCaisse.especes, rapportCaisse.virement, rapportCaisse.credit, logoTata)
    else if (onglet === 'ventes')
      await exportPDFVentes(ventesFiltrees, rapportVentes.ca, rapportVentes.marge, rapportVentes.topProduits, rapportVentes.parMode, { debut: dateDebut, fin: dateFin }, logoTata)
    else if (onglet === 'credits')
      await exportPDFCredits(rapportCredits.enRetard, rapportCredits.total, logoTata)
    else if (onglet === 'inventaire')
      await exportPDFInventaire(rapportInventaire.produits, rapportInventaire.valorisation, logoTata)
  }

  // ── Exports Excel ─────────────────────────────────────────────
  const handleExportExcel = () => {
    if (onglet === 'caisse')
      exportExcelCaisse(rapportCaisse.ventesJour, rapportCaisse.especes, rapportCaisse.virement, rapportCaisse.credit)
    else if (onglet === 'ventes')
      exportExcelVentes(ventesFiltrees, rapportVentes.ca, rapportVentes.marge, rapportVentes.topProduits, rapportVentes.parMode, { debut: dateDebut, fin: dateFin })
    else if (onglet === 'credits')
      exportExcelCredits(rapportCredits.enRetard, rapportCredits.total)
    else if (onglet === 'inventaire')
      exportExcelInventaire(rapportInventaire.produits, rapportInventaire.valorisation)
  }

  // ── Exports Word ──────────────────────────────────────────────
  const handleExportWord = async () => {
    if (onglet === 'caisse')
      await exportWordCaisse(rapportCaisse.ventesJour, rapportCaisse.especes, rapportCaisse.virement, rapportCaisse.credit, logoTata)
    else if (onglet === 'ventes')
      await exportWordVentes(ventesFiltrees, rapportVentes.ca, rapportVentes.marge, rapportVentes.topProduits, rapportVentes.parMode, { debut: dateDebut, fin: dateFin }, logoTata)
    else if (onglet === 'credits')
      await exportWordCredits(rapportCredits.enRetard, rapportCredits.total, logoTata)
    else if (onglet === 'inventaire')
      await exportWordInventaire(rapportInventaire.produits, rapportInventaire.valorisation, logoTata)
  }

  const ONGLETS: { id: OngletType; label: string; icon: React.ElementType }[] = [
    { id: 'caisse',     label: 'Caisse Journalière',  icon: Wallet      },
    { id: 'ventes',     label: 'Analytique Ventes',   icon: TrendingUp  },
    { id: 'credits',    label: 'Balance Crédits',     icon: Users       },
    { id: 'inventaire', label: 'Inventaire Frigo',    icon: Snowflake   },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar titre="Rapports" sous="4 rapports d'activité — Poissonnerie Tata" />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Onglets + Boutons export */}
        <div className="flex items-center gap-2 flex-wrap">
          {ONGLETS.map(o => (
            <button
              key={o.id}
              onClick={() => setOnglet(o.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer
                ${onglet === o.id
                  ? 'bg-[#ECC94B] text-[#1A365D] shadow font-bold'
                  : 'bg-[#2D3748] text-slate-300 hover:bg-[#4A5568] border border-[#4A5568]'}`}
            >
              <o.icon size={13} /> {o.label}
            </button>
          ))}

          {/* Groupe d'export */}
          <div className="ml-auto flex items-center gap-2">
            {/* PDF */}
            <button
              onClick={handleExportPDF}
              title="Exporter en PDF"
              className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors border border-red-600"
            >
              <FileDown size={13} /> PDF
            </button>

            {/* Excel */}
            <button
              onClick={handleExportExcel}
              title="Exporter en Excel"
              className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors border border-green-600"
            >
              <TableProperties size={13} /> Excel
            </button>

            {/* Word */}
            <button
              onClick={handleExportWord}
              title="Exporter en Word"
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors border border-blue-600"
            >
              <BookText size={13} /> Word
            </button>

            {/* Imprimer */}
            <button
              onClick={() => window.print()}
              title="Imprimer"
              className="flex items-center gap-1.5 bg-[#1A365D] hover:bg-[#2A4A7F] text-white text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer transition-colors border border-[#2A4A7F]"
            >
              <Printer size={13} /> Imprimer
            </button>
          </div>
        </div>

        {/* Filtre dates — visible sur rapport ventes */}
        {onglet === 'ventes' && (
          <div className="flex items-center gap-3 bg-[#2D3748] rounded-xl p-3 border border-[#4A5568]">
            <span className="text-slate-400 text-xs">Période :</span>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
              className="bg-[#1A365D]/60 border border-[#4A5568] text-white text-xs px-3 py-1.5 rounded-lg outline-none focus:border-[#ECC94B]" />
            <span className="text-slate-400 text-xs">→</span>
            <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
              className="bg-[#1A365D]/60 border border-[#4A5568] text-white text-xs px-3 py-1.5 rounded-lg outline-none focus:border-[#ECC94B]" />
            {(dateDebut || dateFin) && (
              <button onClick={() => { setDateDebut(''); setDateFin('') }}
                className="text-slate-400 hover:text-white text-xs cursor-pointer">
                Effacer
              </button>
            )}
            <span className="text-slate-400 text-xs ml-auto">{rapportVentes.count} vente(s)</span>
          </div>
        )}

        {/* ── Rapport 1 : Caisse ─────────────────────────── */}
        {onglet === 'caisse' && (
          <div className="space-y-4">
            <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-[#ECC94B]" />
                <h3 className="text-white font-bold text-sm">Rapport de Caisse — {today}</h3>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'TOTAL CAISSE PHYSIQUE', val: rapportCaisse.total,    cls: 'text-green-400',  bg: 'bg-green-900/20 border-green-700/20' },
                  { label: 'Espèces',               val: rapportCaisse.especes,  cls: 'text-white',      bg: 'bg-[#1A365D]/40 border-[#2A4A7F]' },
                  { label: 'Virement',              val: rapportCaisse.virement, cls: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-700/20' },
                  { label: 'En Crédit (hors caisse)',val: rapportCaisse.credit,  cls: 'text-[#ECC94B]',  bg: 'bg-yellow-900/20 border-yellow-700/20' },
                ].map(k => (
                  <div key={k.label} className={`rounded-xl p-4 border ${k.bg}`}>
                    <p className="text-slate-400 text-[10px] uppercase font-semibold mb-1">{k.label}</p>
                    <p className={`font-extrabold text-xl ${k.cls}`}>{fmt(k.val)}</p>
                    <p className="text-slate-500 text-[10px]">GNF</p>
                  </div>
                ))}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] bg-[#1A365D]/60 border-b border-[#4A5568]">
                    <th className="text-left px-4 py-2.5">Client</th>
                    <th className="text-left px-4 py-2.5">Mode</th>
                    <th className="text-right px-4 py-2.5">Encaissé</th>
                    <th className="text-right px-4 py-2.5">Reste</th>
                    <th className="text-left px-4 py-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rapportCaisse.ventesJour.map(v => (
                    <tr key={v.id} className="border-b border-[#4A5568]/30 hover:bg-[#374151]">
                      <td className="px-4 py-2.5 text-white">{v.clientNom}</td>
                      <td className="px-4 py-2.5 text-slate-300">{v.modeReglement}</td>
                      <td className="px-4 py-2.5 text-right text-green-400 font-semibold">{fmt(v.montantEncaisse)} GNF</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${v.resteAPayer > 0 ? 'text-red-400' : 'text-slate-500'}`}>{fmt(v.resteAPayer)} GNF</td>
                      <td className="px-4 py-2.5"><Badge color={v.statut === 'payé' ? 'green' : v.statut === 'crédit' ? 'blue' : 'red'}>{v.statut}</Badge></td>
                    </tr>
                  ))}
                  {rapportCaisse.ventesJour.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">Aucune transaction aujourd'hui</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Rapport 2 : Analytique Ventes ──────────────── */}
        {onglet === 'ventes' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Chiffre d'affaires", val: `${fmt(rapportVentes.ca)} GNF`,    cls: 'text-[#ECC94B]' },
                { label: 'Marge brute estimée', val: `${fmt(rapportVentes.marge)} GNF`, cls: 'text-green-400' },
                { label: 'Nombre de ventes',    val: rapportVentes.count,               cls: 'text-white'     },
              ].map(k => (
                <div key={k.label} className="bg-[#2D3748] rounded-xl p-4 border border-[#4A5568]">
                  <p className="text-slate-400 text-[11px]">{k.label}</p>
                  <p className={`font-extrabold text-xl ${k.cls}`}>{k.val}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Top produits */}
              <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#4A5568]">
                  <h4 className="text-white font-semibold text-sm">Top 5 Produits</h4>
                </div>
                <div className="divide-y divide-[#4A5568]/30">
                  {rapportVentes.topProduits.map((p, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[#ECC94B] font-bold text-sm w-5">{i + 1}</span>
                        <span className="text-white text-xs">{p.nom}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[#ECC94B] font-bold text-xs">{fmt(p.ca)} GNF</p>
                        <p className="text-slate-400 text-[10px]">Qté : {p.qte}</p>
                      </div>
                    </div>
                  ))}
                  {rapportVentes.topProduits.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-xs">Aucune donnée</div>
                  )}
                </div>
              </div>

              {/* Par mode de règlement */}
              <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#4A5568]">
                  <h4 className="text-white font-semibold text-sm">Répartition par Mode</h4>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { label: 'Espèces',  val: rapportVentes.parMode.especes,  cls: 'bg-green-500' },
                    { label: 'Virement', val: rapportVentes.parMode.virement, cls: 'bg-blue-500'  },
                    { label: 'Crédit',   val: rapportVentes.parMode.credit,   cls: 'bg-[#ECC94B]' },
                  ].map(m => {
                    const pct = rapportVentes.ca > 0 ? Math.round((m.val / rapportVentes.ca) * 100) : 0
                    return (
                      <div key={m.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300">{m.label}</span>
                          <span className="text-white font-semibold">{fmt(m.val)} GNF ({pct}%)</span>
                        </div>
                        <div className="bg-[#1A365D] rounded-full h-2">
                          <div className={`h-full rounded-full ${m.cls}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Rapport 3 : Balance Âgée Crédits ───────────── */}
        {onglet === 'credits' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Clients en retard/bloqué', val: rapportCredits.enRetard.length, cls: 'text-[#ECC94B]' },
                { label: 'Encours total',             val: `${fmt(rapportCredits.total)} GNF`, cls: 'text-red-400' },
                { label: 'Comptes bloqués',           val: rapportCredits.bloques,         cls: 'text-red-500' },
              ].map(k => (
                <div key={k.label} className="bg-[#2D3748] rounded-xl p-4 border border-[#4A5568]">
                  <p className="text-slate-400 text-[11px]">{k.label}</p>
                  <p className={`font-extrabold text-xl ${k.cls}`}>{k.val}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#4A5568]">
                <h4 className="text-white font-semibold text-sm">Balance Âgée des Crédits</h4>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] bg-[#1A365D]/60 border-b border-[#4A5568]">
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3">Téléphone</th>
                    <th className="text-right px-4 py-3">Encours</th>
                    <th className="text-right px-4 py-3">Plafond</th>
                    <th className="text-right px-4 py-3">Utilisation</th>
                    <th className="text-left px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rapportCredits.enRetard].sort((a, b) => b.creditEnCours - a.creditEnCours).map(c => {
                    const pct = Math.round((c.creditEnCours / c.plafondCredit) * 100)
                    return (
                      <tr key={c.id} className="border-b border-[#4A5568]/30 hover:bg-[#374151]">
                        <td className="px-4 py-3 text-white font-semibold">{c.nom}</td>
                        <td className="px-4 py-3 text-slate-400">{c.telephone}</td>
                        <td className="px-4 py-3 text-right text-red-400 font-bold">{fmt(c.creditEnCours)} GNF</td>
                        <td className="px-4 py-3 text-right text-slate-300">{fmt(c.plafondCredit)} GNF</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-[#1A365D] rounded-full h-1.5">
                              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-[#ECC94B]'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                            <span className={`font-semibold w-10 text-right ${pct >= 100 ? 'text-red-400' : 'text-[#ECC94B]'}`}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={c.statut === 'bloque' ? 'red' : 'yellow'}>{c.statut}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                  {rapportCredits.enRetard.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">Aucun crédit en retard</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Rapport 4 : Inventaire Frigo ───────────────── */}
        {onglet === 'inventaire' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Valorisation totale', val: `${fmt(rapportInventaire.valorisation)} GNF`, cls: 'text-[#ECC94B]' },
                { label: 'Stock total',          val: `${fmt(rapportInventaire.stockKgTotal)} Kg`,  cls: 'text-cyan-400' },
                { label: 'Alertes rupture',      val: rapportInventaire.alertes.length,             cls: 'text-red-400'  },
              ].map(k => (
                <div key={k.label} className="bg-[#2D3748] rounded-xl p-4 border border-[#4A5568]">
                  <p className="text-slate-400 text-[11px]">{k.label}</p>
                  <p className={`font-extrabold text-xl ${k.cls}`}>{k.val}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#4A5568]">
                <h4 className="text-white font-semibold text-sm">État d'Inventaire Réel — Frigo</h4>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] bg-[#1A365D]/60 border-b border-[#4A5568]">
                    <th className="text-left px-4 py-3">Produit</th>
                    <th className="text-left px-4 py-3">Catégorie</th>
                    <th className="text-right px-4 py-3">Stock Cartons</th>
                    <th className="text-right px-4 py-3">Stock Kg</th>
                    <th className="text-right px-4 py-3">PAMP/Cart</th>
                    <th className="text-right px-4 py-3">Valorisation</th>
                    <th className="text-left px-4 py-3">État</th>
                  </tr>
                </thead>
                <tbody>
                  {rapportInventaire.produits.map(p => {
                    const critique = p.stockCart <= p.seuilAlerte
                    return (
                      <tr key={p.id} className={`border-b border-[#4A5568]/30 hover:bg-[#374151] ${critique ? 'bg-red-950/20' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{p.emoji}</span>
                            <span className="text-white font-medium">{p.nom}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{p.categorie}</td>
                        <td className={`px-4 py-3 text-right font-bold ${critique ? 'text-red-400' : 'text-white'}`}>{p.stockCart}</td>
                        <td className="px-4 py-3 text-right text-slate-300">{fmt(p.stockKg)} Kg</td>
                        <td className="px-4 py-3 text-right text-slate-300">{fmt(p.pampCart)} GNF</td>
                        <td className="px-4 py-3 text-right text-[#ECC94B] font-semibold">{fmt(p.stockCart * p.pampCart)} GNF</td>
                        <td className="px-4 py-3">
                          {critique
                            ? <Badge color="red">⚠ RUPTURE</Badge>
                            : <Badge color="green">OK</Badge>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Rapports
