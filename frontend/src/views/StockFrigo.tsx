import React, { useState, useMemo } from 'react'
import { Plus, Package, AlertTriangle, X } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Badge }  from '../components/Badge'
import type { Produit } from '../types/pos'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

const CATEGORIES = ['Pélagique', 'Démersal', 'Fumé', 'Crustacés', 'Autre']
const EMOJIS     = ['🐟', '🐠', '🐡', '🦈', '🦐', '🦞', '🦀', '🐙', '🫙']
const PROD_INIT  = { nom: '', categorie: 'Pélagique', stockCart: '', kgParCarton: '20', prixCart: '', prixKg: '', pampCart: '', seuilAlerte: '5', emoji: '🐟' }

interface StockFrigoProps {
  produits:          Produit[]
  onAjouterProduit?: (data: Omit<Produit, 'id' | 'updatedAt'>) => Promise<void>
  onModifierStock?:  (id: string, qteAchat: number, prixAchat: number) => Promise<void>
}

export function StockFrigo({ produits, onAjouterProduit, onModifierStock }: StockFrigoProps) {
  const [recherche, setRecherche] = useState('')
  const [reappro, setReappro]     = useState<Record<string, { qte: string; prix: string }>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(PROD_INIT)
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState('')

  const stats = useMemo(() => ({
    valorisation: produits.reduce((s, p) => s + p.stockCart * p.pampCart, 0),
    alertes:      produits.filter(p => p.stockCart <= p.seuilAlerte).length,
    stockKgTotal: produits.reduce((s, p) => s + p.stockKg, 0),
  }), [produits])

  const produitsFiltres = useMemo(
    () => produits.filter(p => p.nom.toLowerCase().includes(recherche.toLowerCase()) || p.categorie.toLowerCase().includes(recherche.toLowerCase())),
    [produits, recherche]
  )

  const handleReappro = async (id: string) => {
    const r = reappro[id]
    if (!r) return
    const qte  = parseInt(r.qte || '0')
    const prix = parseFloat(r.prix || '0')
    if (qte <= 0 || prix <= 0) return
    setLoadingId(id)
    try {
      await onModifierStock?.(id, qte, prix)
      setReappro(prev => ({ ...prev, [id]: { qte: '', prix: '' } }))
    } finally {
      setLoadingId(null)
    }
  }

  const updateForm = (field: string, value: string) => {
    setForm(prev => {
      const u = { ...prev, [field]: value }
      if ((field === 'prixCart' || field === 'kgParCarton') && Number(u.kgParCarton) > 0)
        u.prixKg = String(Math.round(Number(u.prixCart) / Number(u.kgParCarton)))
      if (field === 'prixCart' && !u.pampCart)
        u.pampCart = String(Math.round(Number(value) * 0.85))
      return u
    })
  }

  const handleSaveProduit = async () => {
    setFormErr('')
    if (!form.nom.trim())      { setFormErr('Le nom est obligatoire'); return }
    if (!Number(form.prixCart)) { setFormErr('Le prix carton est obligatoire'); return }
    if (!Number(form.kgParCarton)) { setFormErr('Le poids par carton est obligatoire'); return }

    setSaving(true)
    try {
      const kgParC = Number(form.kgParCarton)
      const cart   = Number(form.stockCart) || 0
      await onAjouterProduit?.({
        nom:         form.nom.trim(),
        categorie:   form.categorie,
        stockCart:   cart,
        stockKg:     cart * kgParC,
        kgParCarton: kgParC,
        prixCart:    Number(form.prixCart),
        prixKg:      Number(form.prixKg) || Math.round(Number(form.prixCart) / kgParC),
        pampCart:    Number(form.pampCart) || Math.round(Number(form.prixCart) * 0.85),
        seuilAlerte: Number(form.seuilAlerte) || 5,
        emoji:       form.emoji,
        actif:       true,
      })
      setForm(PROD_INIT)
      setShowModal(false)
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar titre="Stock Frigo" sous="Gestion double unité — Cartons & Kg" recherche={recherche} setRecherche={setRecherche} showSearch alertCount={stats.alertes} />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#2D3748] rounded-xl p-4 border border-[#4A5568]">
            <p className="text-slate-400 text-[11px]">Valorisation totale</p>
            <p className="text-[#ECC94B] font-extrabold text-lg">{fmt(stats.valorisation)}</p>
            <p className="text-slate-500 text-[10px]">GNF au PAMP</p>
          </div>
          <div className="bg-[#2D3748] rounded-xl p-4 border border-[#4A5568]">
            <p className="text-slate-400 text-[11px]">Stock total</p>
            <p className="text-cyan-400 font-extrabold text-lg">{fmt(stats.stockKgTotal)} Kg</p>
            <p className="text-slate-500 text-[10px]">{produits.length} références</p>
          </div>
          <div className={`rounded-xl p-4 border ${stats.alertes > 0 ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-[#2D3748] border-[#4A5568]'}`}>
            <p className="text-slate-400 text-[11px]">Alertes réapprovisionnement</p>
            <p className={`font-extrabold text-lg ${stats.alertes > 0 ? 'text-[#ECC94B]' : 'text-slate-400'}`}>{stats.alertes} produit(s)</p>
            <p className="text-slate-500 text-[10px]">≤ seuil alerte</p>
          </div>
        </div>

        {/* Tableau */}
        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#4A5568] flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Inventaire Frigo</h3>
            <button onClick={() => { setShowModal(true); setFormErr('') }}
              className="flex items-center gap-1 bg-[#ECC94B] hover:bg-amber-500 text-[#1A365D] text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
              <Plus size={11} /> Nouveau produit
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 uppercase text-[10px] bg-[#1A365D]/60 border-b border-[#4A5568]">
                  <th className="text-left px-4 py-3">Produit</th>
                  <th className="text-left px-4 py-3">Cat.</th>
                  <th className="text-left px-4 py-3">Stock Cart.</th>
                  <th className="text-left px-4 py-3">Stock Kg</th>
                  <th className="text-left px-4 py-3">PAMP/Cart</th>
                  <th className="text-left px-4 py-3">Valorisation</th>
                  <th className="text-left px-4 py-3">État</th>
                  <th className="text-left px-4 py-3">Réappro (Qté / Prix)</th>
                </tr>
              </thead>
              <tbody>
                {produitsFiltres.map(p => {
                  const critique = p.stockCart <= p.seuilAlerte
                  const r = reappro[p.id] ?? { qte: '', prix: '' }
                  return (
                    <tr key={p.id} className={`border-b border-[#4A5568]/40 hover:bg-[#374151] transition-colors ${critique ? 'bg-red-950/20' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{p.emoji}</span>
                          <span className="text-white font-semibold">{p.nom}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{p.categorie}</td>
                      <td className={`px-4 py-3 font-bold ${critique ? 'text-red-400' : 'text-white'}`}>{p.stockCart} Cart</td>
                      <td className="px-4 py-3 text-slate-300">{fmt(p.stockKg)} Kg</td>
                      <td className="px-4 py-3 text-slate-300">{fmt(p.pampCart)} GNF</td>
                      <td className="px-4 py-3 text-[#ECC94B] font-semibold">{fmt(p.stockCart * p.pampCart)} GNF</td>
                      <td className="px-4 py-3">
                        {critique
                          ? <Badge color="red"><AlertTriangle size={9} className="inline mr-1" />RUPTURE</Badge>
                          : <Badge color="green">OK</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input type="number" placeholder="Qté" value={r.qte}
                            onChange={e => setReappro(prev => ({ ...prev, [p.id]: { ...prev[p.id] ?? { qte:'', prix:'' }, qte: e.target.value } }))}
                            className="w-14 bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-[10px] px-2 py-1 rounded outline-none" />
                          <input type="number" placeholder="Prix GNF" value={r.prix}
                            onChange={e => setReappro(prev => ({ ...prev, [p.id]: { ...prev[p.id] ?? { qte:'', prix:'' }, prix: e.target.value } }))}
                            className="w-24 bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-[10px] px-2 py-1 rounded outline-none" />
                          <button onClick={() => handleReappro(p.id)} disabled={!r.qte || !r.prix || loadingId === p.id}
                            className="bg-[#ECC94B] hover:bg-amber-500 disabled:opacity-40 text-[#1A365D] text-[10px] font-bold px-2 py-1 rounded cursor-pointer disabled:cursor-not-allowed">
                            {loadingId === p.id ? '...' : <Package size={11} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nouveau Produit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A365D] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A4A7F]">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Plus size={16} className="text-[#ECC94B]" /> Nouveau Produit
              </h2>
              <button onClick={() => { setShowModal(false); setFormErr('') }} className="text-slate-400 hover:text-white cursor-pointer"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              {formErr && <div className="bg-red-900/50 border border-red-700/50 text-red-300 text-xs px-3 py-2 rounded-lg">⚠️ {formErr}</div>}

              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Nom *</label>
                  <input value={form.nom} onChange={e => updateForm('nom', e.target.value)} placeholder="Ex: Chinchard Mauri 20"
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none placeholder:text-slate-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Emoji</label>
                  <select value={form.emoji} onChange={e => updateForm('emoji', e.target.value)}
                    className="bg-[#2D3748] border border-[#4A5568] text-white text-lg px-2 py-1.5 rounded-lg outline-none cursor-pointer">
                    {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-[11px] font-semibold block mb-1">Catégorie</label>
                <select value={form.categorie} onChange={e => updateForm('categorie', e.target.value)}
                  className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none cursor-pointer">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Stock initial (cartons)</label>
                  <input type="number" min={0} value={form.stockCart} onChange={e => updateForm('stockCart', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Kg par carton *</label>
                  <input type="number" min={1} value={form.kgParCarton} onChange={e => updateForm('kgParCarton', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Prix / Carton (GNF) *</label>
                  <input type="number" min={0} value={form.prixCart} onChange={e => updateForm('prixCart', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Prix / Kg (GNF) <span className="text-slate-500">(auto)</span></label>
                  <input type="number" min={0} value={form.prixKg} onChange={e => updateForm('prixKg', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">PAMP / Carton <span className="text-slate-500">(auto 85%)</span></label>
                  <input type="number" min={0} value={form.pampCart} onChange={e => updateForm('pampCart', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Seuil alerte (cartons)</label>
                  <input type="number" min={1} value={form.seuilAlerte} onChange={e => updateForm('seuilAlerte', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowModal(false); setForm(PROD_INIT); setFormErr('') }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#2D3748] text-slate-300 hover:bg-[#4A5568] cursor-pointer">Annuler</button>
                <button onClick={handleSaveProduit} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-[#ECC94B] hover:bg-amber-500 text-[#1A365D] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
                  {saving ? <span className="inline-block w-4 h-4 border-2 border-[#1A365D]/30 border-t-[#1A365D] rounded-full animate-spin" /> : <Plus size={13} />}
                  {saving ? 'Enregistrement...' : 'Ajouter le produit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StockFrigo
