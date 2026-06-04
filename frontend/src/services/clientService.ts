import type { Client } from '../types/pos'

let _store: Client[] = [
  { id:'c1', nom:'Amadou Diallo',   telephone:'621 000 001', creditEnCours:500000,  plafondCredit:2000000, statut:'retard', historique:[] },
  { id:'c2', nom:'Fatoumata Bah',   telephone:'622 000 002', creditEnCours:0,       plafondCredit:1500000, statut:'actif',  historique:[] },
  { id:'c3', nom:'Mariama Sow',     telephone:'623 000 003', creditEnCours:1800000, plafondCredit:2000000, statut:'retard', historique:[] },
  { id:'c4', nom:'Ibrahima Camara', telephone:'624 000 004', creditEnCours:750000,  plafondCredit:1000000, statut:'retard', historique:[] },
]

function statut(credit: number, plafond: number): Client['statut'] {
  if (credit <= 0)              return 'actif'
  if (credit >= plafond)        return 'bloque'
  if (credit > 0.8 * plafond)  return 'retard'
  return 'actif'
}

export async function getClients(): Promise<Client[]> {
  return [..._store]
}

export async function getClientById(id: string): Promise<Client | null> {
  return _store.find(c => c.id === id) ?? null
}

export async function ajouterClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'historique'>): Promise<string> {
  const id = 'c' + Date.now()
  _store.push({ ...data, id, historique: [], createdAt: new Date(), updatedAt: new Date() })
  return id
}

export async function apurerCredit(clientId: string, montant: number): Promise<void> {
  _store = _store.map(c => {
    if (c.id !== clientId) return c
    const newCredit = Math.max(0, c.creditEnCours - montant)
    return { ...c, creditEnCours: newCredit, statut: statut(newCredit, c.plafondCredit), updatedAt: new Date() }
  })
}

export async function incrementerCredit(clientId: string, montant: number): Promise<void> {
  const c = _store.find(x => x.id === clientId)
  if (!c) throw new Error(`Client ${clientId} introuvable`)
  if (c.creditEnCours + montant > c.plafondCredit) throw new Error('PLAFOND_DEPASSE')
  _store = _store.map(x => {
    if (x.id !== clientId) return x
    const newCredit = x.creditEnCours + montant
    return { ...x, creditEnCours: newCredit, statut: statut(newCredit, x.plafondCredit), updatedAt: new Date() }
  })
}

export async function modifierPlafondCredit(clientId: string, plafond: number): Promise<void> {
  _store = _store.map(c => {
    if (c.id !== clientId) return c
    return { ...c, plafondCredit: plafond, statut: statut(c.creditEnCours, plafond), updatedAt: new Date() }
  })
}
