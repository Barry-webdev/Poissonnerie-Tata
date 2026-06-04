import type { Avarie, AvariePayload } from '../types/pos'

let _store: Avarie[] = [
  { id:'a1', date:new Date('2026-06-03'), dateStr:'2026-06-03', produitId:'p2', produitNom:'Maquereau Mauri 25', qteCart:2, poidsKg:50, motif:'Rupture chaîne froid', valeurPerdue:1040000, validePar:'Admin Tata' },
  { id:'a2', date:new Date('2026-06-02'), dateStr:'2026-06-02', produitId:'p6', produitNom:'Tilapia Fumé',       qteCart:1, poidsKg:20, motif:'Avarie transport',      valeurPerdue:920000,  validePar:'Admin Tata' },
  { id:'a3', date:new Date('2026-06-01'), dateStr:'2026-06-01', produitId:'p5', produitNom:'Sole',               qteCart:3, poidsKg:60, motif:'Dépassement DLC',       valeurPerdue:2550000, validePar:'Admin Tata' },
]

export async function getAvaries(opts?: { dateStr?: string; produitId?: string }): Promise<Avarie[]> {
  let r = [..._store]
  if (opts?.dateStr)   r = r.filter(a => a.dateStr   === opts.dateStr)
  if (opts?.produitId) r = r.filter(a => a.produitId === opts.produitId)
  return r.sort((a, b) => b.date.getTime() - a.date.getTime())
}

export async function ajouterAvarie(payload: AvariePayload): Promise<string> {
  if (!payload.motif?.trim()) throw new Error('Le motif est obligatoire')
  const id  = 'a' + Date.now()
  const now = new Date()
  _store.push({ id, date: now, dateStr: now.toISOString().slice(0, 10), ...payload, motif: payload.motif.trim(), createdAt: now })
  return id
}
