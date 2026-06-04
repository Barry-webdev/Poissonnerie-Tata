import React, { useState, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import { Topbar }      from '../components/Topbar'
import { ProductCard } from '../components/ProductCard'
import { CartSection } from '../components/CartSection'
import type { Produit, Client, CartItem, ModeReglement, TypeUnite, RoleUser } from '../types/pos'

// ── Catégories prédéfinies ────────────────────────────────────
const CATEGORIES = ['Pélagique', 'Démersal', 'Fumé', 'Crustacés', 'Autre']
const EMOJIS     = ['🐟', '🐠', '🐡', '🦈', '🦐', '🦞', '🦀', '🐙', '🫙']

const FORM_INIT = {
  nom:         '',
  categorie:   'Pélagique',
  stockCart:   0,
  kgParCarton: 20,
  prixCart:    0,
  prixKg:      0,
  pampCart:    0,
  seuilAlerte: 5,
  emoji:       '🐟',
}

interface CatalogueProps {
  produits:             Produit[]
  clients:              Client[]
  panier:               CartItem[]
  setPanier:            React.Dispatch<React.SetStateAction<CartItem[]>>
  clientSelectionne:    Client | null
  setClientSelectionne: (c: Client | null) => void
  modeReglement:        ModeReglement
  setModeReglement:     (m: ModeReglement) => void
  encaissement:         string
  setEncaissement:      (v: string) => void
  onValiderVente:       () => Promise<void>
  onAjouterProduit:     (data: Omit<Produit, 'id' | 'updatedAt'>) => Promise<void>
  loading:              boolean
  alertCount?:          number
  userRole?:            RoleUser  // Rôle de l'utilisateur connecté
}

export function Catalogue({
  produits, clients, panier, setPanier,
  clientSelectionne, setClientSelectionne,
  modeReglement, setModeReglement,
  encaissement, setEncaissement,
  onValiderVente, onAjouterProduit,
  loading, alertCount = 0,
  userRole = 'caissier',
}: CatalogueProps) {
  const [recherche, setRecherche]           = useState('')
  const [categorieActive, setCategorieActive] = useState('Tous')
  const [showModal, setShowModal]           = useState(false)
  const [form, setForm]                     = useState(FORM_INIT)
  const [saving, setSaving]                 = useState(false)
  const [formError, setFormError]           = useState<string | null>(null)

  // Vérifier si l'utilisateur est gérant/admin
  const isManager = userRole === 'gerant' || userRole === 'admin'

  // Produits actifs filtrés
  const filtres = useMemo(
    () => produits.filter(p =>
      p.actif && p.nom.toLowerCase().includes(recherche.toLowerCase())
    ),
    [produits, recherche]
  )

  const categories = useMemo(() => {
    const cats = new Set(filtres.map(p => p.categorie))
    return ['Tous', ...Array.from(cats)]
  }, [filtres])

  const produitsFiltres = useMemo(
    () => categorieActive === 'Tous' ? filtres : filtres.filter(p => p.categorie === categorieActive),
    [filtres, categorieActive]
  )

  // Panier
  const ajouterAuPanier = (produit: Produit, type: TypeUnite) => {
    setPanier(prev => {
      const idx = prev.findIndex(x => x.produitId === produit.id && x.type === type)
      if (idx >= 0) {
        return prev.map((x, i) =>
          i === idx ? { ...x, qte: x.qte + 1, total: (x.qte + 1) * x.prixUnit } : x
        )
      }
      const prixUnit = type === 'Carton' ? produit.prixCart : produit.prixKg
      return [...prev, { produitId: produit.id, nom: produit.nom, type, qte: 1, prixUnit, total: prixUnit }]
    })
  }

  const handleQteChange = (produitId: string, type: TypeUnite, delta: number) => {
    setPanier(prev => prev.map(x => {
      if (x.produitId !== produitId || x.type !== type) return x
      const newQte = Math.max(1, x.qte + delta)
      return { ...x, qte: newQte, total: newQte * x.prixUnit }
    }))
  }

  const handleSupprimer = (produitId: string, type: TypeUnite) => {
    setPanier(prev => prev.filter(x => !(x.produitId === produitId && x.type === type)))
  }

  // Mise à jour du formulaire avec recalcul automatique prixKg & stockKg
  const updateForm = (field: string, value: string | number) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      // Auto-calcul prixKg depuis prixCart / kgParCarton
      if ((field === 'prixCart' || field === 'kgParCarton') && updated.kgParCarton > 0) {
        updated.prixKg = Math.round(Number(updated.prixCart) / Number(updated.kgParCarton))
      }
      // Auto-calcul pampCart = 90% du prixCart par défaut si non renseigné
      if (field === 'prixCart' && updated.pampCart === 0) {
        updated.pampCart = Math.round(Number(value) * 0.85)
      }
      return updated
    })
  }

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.nom.trim()) { setFormError('Le nom du produit est obligatoire.'); return }
    if (form.prixCart <= 0) { setFormError('Le prix par carton doit être supérieur à 0.'); return }
    if (form.kgParCarton <= 0) { setFormError('Le poids par carton doit être supérieur à 0.'); return }

    setSaving(true)
    try {
      await onAjouterProduit({
        nom:         form.nom.trim(),
        categorie:   form.categorie,
        stockCart:   Number(form.stockCart),
        stockKg:     Number(form.stockCart) * Number(form.kgParCarton),
        kgParCarton: Number(form.kgParCarton),
        prixCart:    Number(form.prixCart),
        prixKg:      Number(form.prixKg) || Math.round(Number(form.prixCart) / Number(form.kgParCarton)),
        pampCart:    Number(form.pampCart) || Math.round(Number(form.prixCart) * 0.85),
        seuilAlerte: Number(form.seuilAlerte),
        emoji:       form.emoji,
        actif:       true,
      })
      setForm(FORM_INIT)
      setShowModal(false)
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const closeModal = () => { setShowModal(false); setForm(FORM_INIT); setFormError(null) }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Zone catalogue */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          titre="Catalogue Produits"
          sous="Point de vente — sélection des articles"
          recherche={recherche}
          setRecherche={setRecherche}
          showSearch
          alertCount={alertCount}
        />

        <div className="flex-1 overflow-y-auto p-4">
          {/* Barre filtres + bouton */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategorieActive(cat)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer
                  ${categorieActive === cat
                    ? 'bg-[#ECC94B] text-[#1A365D]'
                    : 'bg-[#2D3748] text-slate-300 hover:bg-[#4A5568] border border-[#4A5568]'}`}
              >
                {cat}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">{produitsFiltres.length} produit(s)</span>
              {/* Bouton Nouveau Produit - Uniquement pour gérants/admins */}
              {isManager && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 bg-[#ECC94B] hover:bg-amber-500 text-[#1A365D] text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <Plus size={11} /> Nouveau produit
                </button>
              )}
            </div>
          </div>

          {/* Grille produits */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {produitsFiltres.map(p => (
              <ProductCard key={p.id} produit={p} onAjouter={ajouterAuPanier} />
            ))}
          </div>
          {produitsFiltres.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-sm">Aucun produit trouvé</div>
          )}
        </div>
      </div>

      {/* Panier */}
      <CartSection
        items={panier}
        clients={clients}
        clientSelectionne={clientSelectionne}
        setClientSelectionne={setClientSelectionne}
        modeReglement={modeReglement}
        setModeReglement={setModeReglement}
        encaissement={encaissement}
        setEncaissement={setEncaissement}
        onQteChange={handleQteChange}
        onSupprimer={handleSupprimer}
        onValider={onValiderVente}
        loading={loading}
      />

      {/* ── MODAL Nouveau Produit - Uniquement pour gérants/admins ─────────────────────────────── */}
      {isManager && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1A365D] rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2A4A7F]">
              <h2 className="text-white font-bold text-base flex items-center gap-2">
                <Plus size={16} className="text-[#ECC94B]" /> Nouveau Produit
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Corps du formulaire */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">

              {formError && (
                <div className="bg-red-900/50 border border-red-700/50 text-red-300 text-xs px-3 py-2 rounded-lg">
                  ⚠️ {formError}
                </div>
              )}

              {/* Nom + Emoji */}
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Nom du produit *</label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={e => updateForm('nom', e.target.value)}
                    placeholder="Ex: Chinchard Mauri 20"
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none placeholder:text-slate-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Emoji</label>
                  <select
                    value={form.emoji}
                    onChange={e => updateForm('emoji', e.target.value)}
                    className="bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-lg px-2 py-2 rounded-lg outline-none cursor-pointer h-[34px]"
                  >
                    {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
              </div>

              {/* Catégorie */}
              <div>
                <label className="text-slate-300 text-[11px] font-semibold block mb-1">Catégorie</label>
                <select
                  value={form.categorie}
                  onChange={e => updateForm('categorie', e.target.value)}
                  className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none cursor-pointer transition-colors"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Stock initial + Poids par carton */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Stock initial (cartons)</label>
                  <input
                    type="number" min={0}
                    value={form.stockCart}
                    onChange={e => updateForm('stockCart', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Kg par carton *</label>
                  <input
                    type="number" min={1}
                    value={form.kgParCarton}
                    onChange={e => updateForm('kgParCarton', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Prix carton + Prix kg */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Prix / Carton (GNF) *</label>
                  <input
                    type="number" min={0}
                    value={form.prixCart}
                    onChange={e => updateForm('prixCart', e.target.value)}
                    placeholder="Ex: 450000"
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none placeholder:text-slate-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">
                    Prix / Kg (GNF)
                    <span className="text-slate-500 ml-1">(auto)</span>
                  </label>
                  <input
                    type="number" min={0}
                    value={form.prixKg}
                    onChange={e => updateForm('prixKg', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none transition-colors"
                  />
                </div>
              </div>

              {/* PAMP + Seuil alerte */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">
                    PAMP / Carton (GNF)
                    <span className="text-slate-500 ml-1">(auto 85%)</span>
                  </label>
                  <input
                    type="number" min={0}
                    value={form.pampCart}
                    onChange={e => updateForm('pampCart', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-[11px] font-semibold block mb-1">Seuil alerte (cartons)</label>
                  <input
                    type="number" min={1}
                    value={form.seuilAlerte}
                    onChange={e => updateForm('seuilAlerte', e.target.value)}
                    className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Aperçu */}
              {form.nom && (
                <div className="bg-[#2D3748] rounded-xl p-3 border border-[#4A5568]">
                  <p className="text-slate-400 text-[10px] uppercase font-semibold mb-2">Aperçu</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{form.emoji}</span>
                    <div>
                      <p className="text-white font-semibold text-xs">{form.nom}</p>
                      <p className="text-slate-400 text-[10px]">{form.categorie} — {form.stockCart} Cart / {Number(form.stockCart) * Number(form.kgParCarton)} Kg</p>
                      <p className="text-[#ECC94B] text-[10px] font-bold">
                        {Number(form.prixCart).toLocaleString('fr-FR')} GNF/C
                        &nbsp;·&nbsp;
                        {(form.prixKg || Math.round(Number(form.prixCart) / (Number(form.kgParCarton) || 1))).toLocaleString('fr-FR')} GNF/Kg
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#2D3748] text-slate-300 hover:bg-[#4A5568] cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-extrabold bg-[#ECC94B] hover:bg-amber-500 text-[#1A365D] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  {saving
                    ? <span className="inline-block w-4 h-4 border-2 border-[#1A365D]/30 border-t-[#1A365D] rounded-full animate-spin" />
                    : <Plus size={13} />
                  }
                  {saving ? 'Enregistrement…' : 'Ajouter le produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalogue
