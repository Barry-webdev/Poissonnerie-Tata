// frontend/src/views/Avaries.tsx
import React, { useState, useMemo } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Badge } from '../components/Badge'
import type { Produit, Avarie, AvariePayload } from '../types/pos'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

interface AvariesProps {
  produits:        Produit[]
  avaries:         Avarie[]
  onAjouterAvarie: (payload: AvariePayload) => Promise<void>
}

const FORM_INIT = {
  produitId: '',
  qteCart:   '',
  poidsKg:   '',
  motif:     '',
}

export function Avaries({ produits, avaries, onAjouterAvarie }: AvariesProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(FORM_INIT)
  const [erreur, setErreur]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [filtreId, setFiltreId] = useState('')

  const avariesFiltrées = useMemo(
    () => filtreId
      ? avaries.filter(a => a.produitId === filtreId)
      : [...avaries].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [avaries, filtreId]
  )

  const totalValeurPerdue = useMemo(
    () => avaries.reduce((s, a) => s + a.valeurPerdue, 0),
    [avaries]
  )

  // Calcule la valeur perdue selon les données du produit sélectionné
  const calculerValeurPerdue = (produitId: string, qteCart: number, poidsKg: number): number => {
    const produit = produits.find(p => p.id === produitId)
    if (!produit) return 0
    return (qteCart * produit.pampCart) + (poidsKg * produit.prixKg)
  }

  const handleSubmit = async () => {
    setErreur('')

    // Propriété 7 : motif obligatoire — Exigence 10.1
    if (!form.motif || form.motif.trim() === '') {
      setErreur('Le motif est obligatoire')
      return
    }
    if (!form.produitId) {
      setErreur('Sélectionner un produit')
      return
    }
    const qteCart = parseInt(form.qteCart || '0')
    const poidsKg = parseFloat(form.poidsKg || '0')
    if (qteCart === 0 && poidsKg === 0) {
      setErreur('Saisir une quantité (cartons ou kg)')
      return
    }

    const produit = produits.find(p => p.id === form.produitId)
    if (!produit) return

    // Exigence 10.4 : calcul valeurPerdue
    const valeurPerdue = calculerValeurPerdue(form.produitId, qteCart, poidsKg)

    const payload: AvariePayload = {
      produitId:    form.produitId,
      produitNom:   produit.nom,
      qteCart,
      poidsKg,
      motif:        form.motif.trim(),
      valeurPerdue,
      validePar:    'Admin Tata',
    }

    setLoading(true)
    try {
      await onAjouterAvarie(payload)
      setForm(FORM_INIT)
      setShowForm(false)
    } catch (err) {
      setErreur((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        titre="Avaries & Pertes"
        sous="Enregistrement des sorties non commerciales"
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#2D3748] rounded-xl p-4 border border-[#4A5568]">
            <p className="text-slate-400 text-[11px]">Total avaries</p>
            <p className="text-white font-extrabold text-lg">{avaries.length}</p>
            <p className="text-slate-500 text-[10px]">enregistrées</p>
          </div>
          <div className="bg-red-950/30 rounded-xl p-4 border border-red-700/30">
            <p className="text-slate-400 text-[11px]">Valeur totale perdue</p>
            <p className="text-red-400 font-extrabold text-lg">{fmt(totalValeurPerdue)}</p>
            <p className="text-slate-500 text-[10px]">GNF</p>
          </div>
          <div className="bg-[#2D3748] rounded-xl p-4 border border-[#4A5568]">
            <p className="text-slate-400 text-[11px]">Produits touchés</p>
            <p className="text-[#ECC94B] font-extrabold text-lg">
              {new Set(avaries.map(a => a.produitId)).size}
            </p>
            <p className="text-slate-500 text-[10px]">références</p>
          </div>
        </div>

        {/* Barre outils */}
        <div className="flex items-center gap-3">
          <select
            value={filtreId}
            onChange={e => setFiltreId(e.target.value)}
            className="bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer"
          >
            <option value="">Tous les produits</option>
            {produits.map(p => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>
          <button
            onClick={() => { setShowForm(f => !f); setErreur('') }}
            className="flex items-center gap-1.5 bg-[#ECC94B] hover:bg-amber-500 text-[#1A365D] text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ml-auto"
          >
            <Plus size={12} /> Nouvelle Avarie
          </button>
        </div>

        {/* Formulaire nouvelle avarie */}
        {showForm && (
          <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#ECC94B]" />
              Nouvelle Avarie
            </h3>

            {erreur && (
              <div className="bg-red-900/40 border border-red-700/40 text-red-400 text-xs px-3 py-2 rounded-lg">
                {erreur}
              </div>
            )}

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="xl:col-span-2">
                <p className="text-slate-400 text-[10px] mb-1">Produit *</p>
                <select
                  value={form.produitId}
                  onChange={e => setForm(p => ({ ...p, produitId: e.target.value }))}
                  className="w-full bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer"
                >
                  <option value="">— Sélectionner —</option>
                  {produits.map(p => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] mb-1">Cartons perdus</p>
                <input
                  type="number"
                  value={form.qteCart}
                  onChange={e => setForm(p => ({ ...p, qteCart: e.target.value }))}
                  className="w-full bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none"
                  min="0"
                />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] mb-1">Kg perdus</p>
                <input
                  type="number"
                  value={form.poidsKg}
                  onChange={e => setForm(p => ({ ...p, poidsKg: e.target.value }))}
                  className="w-full bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none"
                  min="0"
                />
              </div>
            </div>

            {/* Motif obligatoire — Propriété 7, Exigence 10.1 */}
            <div>
              <p className="text-slate-400 text-[10px] mb-1">
                Motif * <span className="text-red-400">(obligatoire)</span>
              </p>
              <input
                type="text"
                value={form.motif}
                onChange={e => setForm(p => ({ ...p, motif: e.target.value }))}
                placeholder="Ex: Rupture chaîne froid, dépassement DLC..."
                className="w-full bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none placeholder:text-slate-500 transition-colors"
              />
            </div>

            {/* Aperçu valeur perdue */}
            {form.produitId && (parseInt(form.qteCart || '0') > 0 || parseFloat(form.poidsKg || '0') > 0) && (
              <div className="bg-red-900/30 border border-red-700/30 rounded-lg px-3 py-2">
                <span className="text-slate-400 text-xs">Valeur estimée perdue : </span>
                <span className="text-red-400 font-bold text-xs">
                  {fmt(calculerValeurPerdue(form.produitId, parseInt(form.qteCart || '0'), parseFloat(form.poidsKg || '0')))} GNF
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowForm(false); setForm(FORM_INIT); setErreur('') }}
                className="px-4 py-1.5 rounded-lg text-xs text-slate-300 bg-[#4A5568] hover:bg-slate-600 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#ECC94B] text-[#1A365D] hover:bg-amber-500 disabled:opacity-60 cursor-pointer transition-colors"
              >
                {loading ? 'Enregistrement...' : 'Valider l\'Avarie'}
              </button>
            </div>
          </div>
        )}

        {/* Historique avaries — Exigence 10.6 */}
        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#4A5568]">
            <h3 className="text-white font-semibold text-sm">Historique des Avaries</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 uppercase text-[10px] bg-[#1A365D]/60 border-b border-[#4A5568]">
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Produit</th>
                  <th className="text-left px-4 py-3 font-semibold">Cartons</th>
                  <th className="text-left px-4 py-3 font-semibold">Kg</th>
                  <th className="text-left px-4 py-3 font-semibold">Motif</th>
                  <th className="text-left px-4 py-3 font-semibold">Valeur perdue</th>
                  <th className="text-left px-4 py-3 font-semibold">Validé par</th>
                </tr>
              </thead>
              <tbody>
                {avariesFiltrées.map(a => (
                  <tr key={a.id} className="border-b border-[#4A5568]/40 hover:bg-[#374151] transition-colors">
                    <td className="px-4 py-3 text-slate-400">{a.dateStr}</td>
                    <td className="px-4 py-3 text-white font-medium">{a.produitNom}</td>
                    <td className="px-4 py-3 text-slate-300">{a.qteCart} Cart.</td>
                    <td className="px-4 py-3 text-slate-300">{a.poidsKg} Kg</td>
                    <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate">{a.motif}</td>
                    <td className="px-4 py-3 text-red-400 font-bold">{fmt(a.valeurPerdue)} GNF</td>
                    <td className="px-4 py-3">
                      <Badge color="slate">{a.validePar}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {avariesFiltrées.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-xs">Aucune avarie enregistrée</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Avaries
