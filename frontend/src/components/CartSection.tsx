// frontend/src/components/CartSection.tsx
import React, { useMemo } from 'react'
import {
  ShoppingCart, Fish, AlertTriangle, CreditCard,
  Minus, Plus, Trash2,
} from 'lucide-react'
import type { CartSectionProps } from '../types/pos'

const MODES = ['Espèces', 'Virement', 'Crédit'] as const
const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

export function CartSection({
  items,
  clients,
  clientSelectionne,
  setClientSelectionne,
  modeReglement,
  setModeReglement,
  encaissement,
  setEncaissement,
  onQteChange,
  onSupprimer,
  onValider,
  loading,
}: CartSectionProps) {

  // Propriété 8 : totalisation panier — Exigences 3.1, 3.2
  const totalNet = useMemo(
    () => items.reduce((s, i) => s + i.qte * i.prixUnit, 0),
    [items]
  )

  const montantEncaisse = parseFloat(encaissement) || 0
  const resteAPayer     = Math.max(0, totalNet - montantEncaisse)

  // Marge disponible pour crédit — Exigences 3.3, 3.4
  const margeDisponible = clientSelectionne
    ? clientSelectionne.plafondCredit - clientSelectionne.creditEnCours
    : Infinity

  const alerteCredit = modeReglement === 'Crédit' && isFinite(margeDisponible)
    && resteAPayer > margeDisponible * 0.8

  const plafondDepasse = modeReglement === 'Crédit' && isFinite(margeDisponible)
    && resteAPayer > margeDisponible

  const totalArticles = items.reduce((s, i) => s + i.qte, 0)

  return (
    <aside className="flex flex-col bg-[#1A365D] border-l border-[#2A4A7F] shrink-0" style={{ width: 300 }}>
      {/* En-tête panier */}
      <div className="px-4 py-3 border-b border-[#2A4A7F] flex items-center justify-between shrink-0">
        <h2 className="text-white font-bold text-sm flex items-center gap-2">
          <ShoppingCart size={15} /> Panier
        </h2>
        <span className="bg-[#ECC94B] text-[#1A365D] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
          {totalArticles} art.
        </span>
      </div>

      {/* Sélection client */}
      <div className="px-3 pt-3 pb-1 shrink-0">
        <p className="text-slate-400 text-[10px] uppercase font-semibold mb-1">Client</p>
        <select
          value={clientSelectionne?.id ?? ''}
          onChange={e => {
            const c = clients.find(x => x.id === e.target.value) ?? null
            setClientSelectionne(c)
          }}
          className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none transition-colors cursor-pointer"
        >
          <option value="">— Client anonyme —</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
        {clientSelectionne && (
          <p className="text-slate-400 text-[10px] mt-1">
            Crédit : <span className="text-[#ECC94B] font-bold">{fmt(clientSelectionne.creditEnCours)}</span> / {fmt(clientSelectionne.plafondCredit)} GNF
          </p>
        )}
      </div>

      {/* Liste articles */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 mt-12 text-slate-500">
            <Fish size={28} className="opacity-20" />
            <span className="text-xs">Panier vide</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto] gap-1 text-[10px] text-slate-500 uppercase font-semibold px-1 pb-1 border-b border-[#2A4A7F]">
              <span>Produit</span><span>Qté</span><span>Total</span>
            </div>
            {items.map(item => (
              <div key={`${item.produitId}-${item.type}`} className="bg-[#2D3748] rounded-lg p-2.5">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 pr-1">
                    <p className="text-white text-[11px] font-semibold leading-tight">{item.nom}</p>
                    <span className="text-slate-500 text-[9px]">{item.type}</span>
                  </div>
                  <button
                    onClick={() => onSupprimer(item.produitId, item.type)}
                    className="text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onQteChange(item.produitId, item.type, -1)}
                    className="w-5 h-5 bg-[#4A5568] hover:bg-slate-500 text-white rounded flex items-center justify-center cursor-pointer"
                  >
                    <Minus size={9} />
                  </button>
                  <span className="text-white text-xs w-5 text-center font-bold">{item.qte}</span>
                  <button
                    onClick={() => onQteChange(item.produitId, item.type, +1)}
                    className="w-5 h-5 bg-[#4A5568] hover:bg-slate-500 text-white rounded flex items-center justify-center cursor-pointer"
                  >
                    <Plus size={9} />
                  </button>
                  <span className="text-slate-400 text-[11px] flex-1 ml-1">
                    {fmt(item.prixUnit)} GNF
                  </span>
                  <span className="text-[#ECC94B] text-xs font-bold">
                    {fmt(item.qte * item.prixUnit)}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Alerte crédit — Exigence 3.3 */}
      {alerteCredit && (
        <div className="mx-3 mb-2 bg-[#ECC94B] rounded-xl p-2.5 shrink-0">
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={13} className="text-[#1A365D] mt-0.5 shrink-0" />
            <p className="text-[#1A365D] text-[10px] font-bold leading-snug">
              {plafondDepasse
                ? `PLAFOND DÉPASSÉ — Limite : ${fmt(margeDisponible)} GNF disponible`
                : `ATTENTION : proche du plafond. Plus que ${fmt(margeDisponible - resteAPayer)} GNF disponible.`}
            </p>
          </div>
        </div>
      )}

      {/* Bas du panier : totaux + validation */}
      <div className="px-3 pb-4 space-y-2 border-t border-[#2A4A7F] pt-3 shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-slate-300 text-xs">Total Net</span>
          <span className="text-white font-extrabold text-sm">{fmt(totalNet)} GNF</span>
        </div>

        {/* Mode de règlement */}
        <div>
          <p className="text-slate-400 text-[10px] mb-1">Mode de règlement</p>
          <div className="grid grid-cols-3 gap-1">
            {MODES.map(m => (
              <button
                key={m}
                onClick={() => setModeReglement(m)}
                className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer
                  ${modeReglement === m
                    ? 'bg-[#ECC94B] text-[#1A365D] font-bold'
                    : 'bg-[#2D3748] text-slate-300 hover:bg-[#4A5568]'
                  }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Montant encaissé */}
        <div>
          <p className="text-slate-400 text-[10px] mb-1">Montant encaissé (GNF)</p>
          <input
            type="number"
            value={encaissement}
            onChange={e => setEncaissement(e.target.value)}
            placeholder="Ex: 1 500 000"
            className="w-full bg-[#2D3748] border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-2 rounded-lg outline-none placeholder:text-slate-500 transition-colors"
          />
        </div>

        {/* Reste à payer — Exigence 15.3 */}
        <div className="bg-[#ECC94B] rounded-xl px-3 py-2 flex justify-between items-center">
          <span className="text-[#1A365D] font-bold text-xs">Reste à payer</span>
          <span className="text-[#1A365D] font-extrabold text-base">{fmt(resteAPayer)} GNF</span>
        </div>

        {/* Bouton valider — désactivé si plafond dépassé — Exigence 3.4 */}
        <button
          onClick={onValider}
          disabled={items.length === 0 || plafondDepasse || loading}
          className="w-full bg-[#ECC94B] hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-[#1A365D] font-extrabold py-2.5 rounded-xl text-xs transition-colors shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-[#1A365D]/30 border-t-[#1A365D] rounded-full animate-spin" />
          ) : (
            <CreditCard size={14} />
          )}
          {loading ? 'Traitement…' : 'Valider l\'Encaissement'}
        </button>
      </div>
    </aside>
  )
}

export default CartSection
