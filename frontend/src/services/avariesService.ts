import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Avarie, AvariePayload } from '../types/pos'

const COLLECTION = 'avaries'

function toDate(timestamp: any): Date {
  if (!timestamp) return new Date()
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
}

export async function getAvaries(opts?: { dateStr?: string; produitId?: string }): Promise<Avarie[]> {
  try {
    let q = query(collection(db, COLLECTION), orderBy('date', 'desc'))

    if (opts?.dateStr) {
      q = query(collection(db, COLLECTION), where('dateStr', '==', opts.dateStr), orderBy('date', 'desc'))
    } else if (opts?.produitId) {
      q = query(collection(db, COLLECTION), where('produitId', '==', opts.produitId), orderBy('date', 'desc'))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: toDate(doc.data().date),
      createdAt: toDate(doc.data().createdAt),
    })) as Avarie[]
  } catch (error) {
    console.error('Erreur getAvaries:', error)
    throw new Error('Impossible de charger les avaries')
  }
}

export async function ajouterAvarie(payload: AvariePayload): Promise<string> {
  if (!payload.motif?.trim()) {
    throw new Error('Le motif est obligatoire')
  }

  try {
    const now = new Date()
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...payload,
      motif: payload.motif.trim(),
      date: serverTimestamp(),
      dateStr: now.toISOString().slice(0, 10),
      createdAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Erreur ajouterAvarie:', error)
    throw new Error('Impossible d\'enregistrer l\'avarie')
  }
}
