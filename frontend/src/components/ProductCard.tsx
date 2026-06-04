// frontend/src/components/ProductCard.tsx
import React from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import type { ProductCardProps } from '../types/pos'

// Formatteur nombre GNF
const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

export function ProductCard({ produit, onAjouter }: ProductCardProps) {
  const critique = produit.stockCart <= produit.seuilAlerte

  return (
    <div
      className={`relative bg-[#2D3748] rounded-xl p-4 flex flex-col gap-3 border transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-default
        ${critique ? 'border-red-500/50' : 'border-[#4A5568] hover:border-[#ECC94B]'}`}
    >
      {/* Badge alerte rupture — Exigence 2.3 */}
      {critique && (
        <span className="absolute -top-2.5 left-3 bg-[#ECC94B] text-[#1A365D] text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow z-10">
          <AlertTriangle size={8} /> ALERTE RUPTURE
        </span>
      )}

      {/* Entête produit */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1A365D] flex items-center justify-center text-xl shrink-0">
          {produit.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-xs leading-tight">{produit.nom}</p>
          <p className={`text-[11px] mt-0.5 ${critique ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
            {produit.stockCart} Cart / {fmt(produit.stockKg)} Kg
          </p>
          <p className="text-slate-500 text-[10px]">{produit.categorie}</p>
        </div>
      </div>

      {/* Prix */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[#1A365D]/60 rounded-lg px-2 py-1.5">
          <p className="text-slate-400 text-[9px] uppercase font-semibold mb-0.5">/ Carton</p>
          <p className="text-[#ECC94B] font-extrabold">{fmt(produit.prixCart)} <span className="text-[9px] text-slate-400 font-normal">GNF</span></p>
        </div>
        <div className="bg-[#1A365D]/60 rounded-lg px-2 py-1.5">
          <p className="text-slate-400 text-[9px] uppercase font-semibold mb-0.5">/ Kg</p>
          <p className="text-[#ECC94B] font-extrabold">{fmt(produit.prixKg)} <span className="text-[9px] text-slate-400 font-normal">GNF</span></p>
        </div>
      </div>

      {/* Boutons d'ajout — Exigences 2.4 et 2.5 */}
      <div className="flex gap-2">
        <button
          onClick={() => onAjouter(produit, 'Carton')}
          className="flex-1 flex items-center justify-center gap-1 bg-[#ECC94B] hover:bg-amber-500 text-[#1A365D] text-[11px] font-bold py-1.5 rounded-lg transition-colors shadow cursor-pointer"
        >
          <Plus size={11} strokeWidth={2.5} /> Carton
        </button>
        <button
          onClick={() => onAjouter(produit, 'Kg')}
          className="flex-1 flex items-center justify-center gap-1 bg-[#2A4A7F] hover:bg-[#4A5568] text-white text-[11px] font-semibold py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <Plus size={11} strokeWidth={2.5} /> Kg
        </button>
      </div>
    </div>
  )
}

export default ProductCard
