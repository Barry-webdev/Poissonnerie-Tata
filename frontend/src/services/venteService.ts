import type { Vente, VentePayload } from '../types/pos'

let _store: Vente[] = [
  {
    id:'v1', date:new Date('2026-06-03'), dateStr:'2026-06-03',
    clientId:'c1', clientNom:'Amadou Diallo',
    lignes:[{ produitId:'p1', produitNom:'Chinchard Mauri 20', type:'Carton', qte:2, prixUnit:450000, total:900000 }],
    totalNet:900000, modeReglement:'Espèces', montantEncaisse:900000, resteAPayer:0,
    caissier:'Admin Tata', statut:'payé', locked:true, modifiePar:null, modifieAt:null,
  },
  {
    id:'v2', date:new Date('2026-06-03'), dateStr:'2026-06-03',
    clientId:'c2', clientNom:'Fatoumata Bah',
    lignes:[{ produitId:'p3', produitNom:'Sardinelle Bonite', type:'Carton', qte:5, prixUnit:380000, total:1900000 }],
    totalNet:1900000, modeReglement:'Crédit', montantEncaisse:0, resteAPayer:1900000,
    caissier:'Admin Tata', statut:'crédit', locked:true, modifiePar:null, modifieAt:null,
  },
  {
    id:'v3', date:new Date('2026-06-03'), dateStr:'2026-06-03',
    clientId:'c4', clientNom:'Ibrahima Camara',
    lignes:[{ produitId:'p4', produitNom:'Capitan', type:'Kg', qte:25, prixUnit:30500, total:762500 }],
    totalNet:762500, modeReglement:'Virement', montantEncaisse:762500, resteAPayer:0,
    caissier:'Admin Tata', statut:'payé', locked:true, modifiePar:null, modifieAt:null,
  },
  {
    id:'v4', date:new Date('2026-06-02'), dateStr:'2026-06-02',
    clientId:'c3', clientNom:'Mariama Sow',
    lignes:[{ produitId:'p5', produitNom:'Sole', type:'Carton', qte:3, prixUnit:850000, total:2550000 }],
    totalNet:2550000, modeReglement:'Crédit', montantEncaisse:0, resteAPayer:2550000,
    caissier:'Admin Tata', statut:'retard', locked:true, modifiePar:null, modifieAt:null,
  },
  {
    id:'v5', date:new Date('2026-06-02'), dateStr:'2026-06-02',
    clientId:'c1', clientNom:'Amadou Diallo',
    lignes:[{ produitId:'p2', produitNom:'Maquereau Mauri 25', type:'Carton', qte:1, prixUnit:520000, total:520000 }],
    totalNet:520000, modeReglement:'Espèces', montantEncaisse:520000, resteAPayer:0,
    caissier:'Admin Tata', statut:'payé', locked:true, modifiePar:null, modifieAt:null,
  },
]

export async function getVentes(): Promise<Vente[]> {
  return [..._store].sort((a, b) => b.date.getTime() - a.date.getTime())
}

export async function ajouterVente(payload: VentePayload): Promise<string> {
  const id  = 'v' + Date.now()
  const now = new Date()
  _store.push({ id, date: now, dateStr: now.toISOString().slice(0, 10), ...payload, locked: true, modifiePar: null, modifieAt: null })
  return id
}

export async function deverrouillerVente(venteId: string, pin: string): Promise<boolean> {
  if (pin !== '1234') return false
  _store = _store.map(v => v.id === venteId ? { ...v, locked: false } : v)
  return true
}

export async function rectifierVente(venteId: string, delta: Partial<Vente>, modifiePar: string): Promise<void> {
  _store = _store.map(v =>
    v.id === venteId ? { ...v, ...delta, locked: true, modifiePar, modifieAt: new Date() } : v
  )
}
