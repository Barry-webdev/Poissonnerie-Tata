import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Vente, VentePayload } from '../types/pos'

const COLLECTION = 'ventes'

function toDate(timestamp: any): Date {
  if (!timestamp) return new Date()
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
}

export async function getVentes(): Promise<Vente[]> {
  try {
    const q = query(collection(db, COLLECTION), orderBy('date', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        date: toDate(data.date),
        modifieAt: data.modifieAt ? toDate(data.modifieAt) : null,
      }
    }) as Vente[]
  } catch (error) {
    console.error('Erreur getVentes:', error)
    throw new Error('Impossible de charger les ventes')
  }
}

export async function ajouterVente(payload: VentePayload): Promise<string> {
  try {
    const now = new Date()
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...payload,
      date: serverTimestamp(),
      dateStr: now.toISOString().slice(0, 10),
      locked: true,
      modifiePar: null,
      modifieAt: null,
    })
    return docRef.id
  } catch (error) {
    console.error('Erreur ajouterVente:', error)
    throw new Error('Impossible d\'enregistrer la vente')
  }
}

export async function deverrouillerVente(venteId: string, pin: string): Promise<boolean> {
  const superPin = import.meta.env.VITE_SUPER_ADMIN_PIN || '1234'
  if (pin !== superPin) return false

  try {
    const docRef = doc(db, COLLECTION, venteId)
    await updateDoc(docRef, { locked: false })
    return true
  } catch (error) {
    console.error('Erreur deverrouillerVente:', error)
    return false
  }
}

export async function rectifierVente(venteId: string, delta: Partial<Vente>, modifiePar: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, venteId)
    await updateDoc(docRef, {
      ...delta,
      locked: true,
      modifiePar,
      modifieAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Erreur rectifierVente:', error)
    throw new Error('Impossible de rectifier la vente')
  }
}
