import type { Produit, LigneVente } from '../types/pos'

let _store: Produit[] = [
  { id:'p1', nom:'Chinchard Mauri 20', categorie:'Pélagique', stockCart:45, stockKg:900,  kgParCarton:20, prixCart:450000, prixKg:22500, pampCart:380000, seuilAlerte:5, emoji:'🐟', actif:true },
  { id:'p2', nom:'Maquereau Mauri 25', categorie:'Pélagique', stockCart:3,  stockKg:75,   kgParCarton:25, prixCart:520000, prixKg:20800, pampCart:430000, seuilAlerte:5, emoji:'🐠', actif:true },
  { id:'p3', nom:'Sardinelle Bonite',  categorie:'Pélagique', stockCart:28, stockKg:560,  kgParCarton:20, prixCart:380000, prixKg:19000, pampCart:310000, seuilAlerte:5, emoji:'🐡', actif:true },
  { id:'p4', nom:'Capitan',            categorie:'Démersal',  stockCart:12, stockKg:240,  kgParCarton:20, prixCart:610000, prixKg:30500, pampCart:510000, seuilAlerte:5, emoji:'🦈', actif:true },
  { id:'p5', nom:'Sole',               categorie:'Démersal',  stockCart:7,  stockKg:140,  kgParCarton:20, prixCart:850000, prixKg:42500, pampCart:700000, seuilAlerte:5, emoji:'🐟', actif:true },
  { id:'p6', nom:'Tilapia Fumé',       categorie:'Fumé',      stockCart:2,  stockKg:40,   kgParCarton:20, prixCart:920000, prixKg:46000, pampCart:750000, seuilAlerte:5, emoji:'🐠', actif:true },
]

export async function getProduits(): Promise<Produit[]> {
  return [..._store]
}

export async function getProduitById(id: string): Promise<Produit | null> {
  return _store.find(p => p.id === id) ?? null
}

export async function ajouterProduit(data: Omit<Produit, 'id' | 'updatedAt'>): Promise<string> {
  const id = 'p' + Date.now()
  _store.push({ ...data, id, updatedAt: new Date() })
  return id
}

export async function modifierProduit(id: string, delta: Partial<Omit<Produit, 'id'>>): Promise<void> {
  _store = _store.map(p => p.id === id ? { ...p, ...delta, updatedAt: new Date() } : p)
}

export async function deduireStock(lignes: LigneVente[]): Promise<void> {
  for (const l of lignes) {
    const p = _store.find(x => x.id === l.produitId)
    if (!p) throw new Error(`Produit ${l.produitNom} introuvable`)
    if (l.type === 'Carton' && p.stockCart < l.qte) throw new Error(`Stock insuffisant — ${l.produitNom} (${p.stockCart} cartons restants)`)
    if (l.type === 'Kg'     && p.stockKg   < l.qte) throw new Error(`Stock insuffisant — ${l.produitNom} (${p.stockKg} kg restants)`)
  }
  for (const l of lignes) {
    _store = _store.map(p => {
      if (p.id !== l.produitId) return p
      return {
        ...p,
        stockCart: l.type === 'Carton' ? p.stockCart - l.qte : p.stockCart,
        stockKg:   l.type === 'Kg'     ? p.stockKg   - l.qte : p.stockKg,
        updatedAt: new Date(),
      }
    })
  }
}

export async function mettreAJourPAMP(id: string, qteAchat: number, prixAchat: number): Promise<void> {
  _store = _store.map(p => {
    if (p.id !== id) return p
    const newPamp = (p.stockCart * p.pampCart + qteAchat * prixAchat) / (p.stockCart + qteAchat)
    return {
      ...p,
      stockCart: p.stockCart + qteAchat,
      stockKg:   (p.stockCart + qteAchat) * p.kgParCarton,
      pampCart:  Math.round(newPamp),
      updatedAt: new Date(),
    }
  })
}
