import { collection, doc, getDocs, getDoc, addDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Client } from '../types/pos'

const COLLECTION = 'clients'

function toDate(timestamp: any): Date | undefined {
  if (!timestamp) return undefined
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
}

function calculerStatut(credit: number, plafond: number): Client['statut'] {
  if (credit <= 0) return 'actif'
  if (credit >= plafond) return 'bloque'
  if (credit > 0.8 * plafond) return 'retard'
  return 'actif'
}

export async function getClients(): Promise<Client[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: toDate(doc.data().createdAt),
      updatedAt: toDate(doc.data().updatedAt),
    })) as Client[]
  } catch (error) {
    console.error('Erreur getClients:', error)
    throw new Error('Impossible de charger les clients')
  }
}

export async function getClientById(id: string): Promise<Client | null> {
  try {
    const docRef = doc(db, COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: toDate(docSnap.data().createdAt),
      updatedAt: toDate(docSnap.data().updatedAt),
    } as Client
  } catch (error) {
    console.error('Erreur getClientById:', error)
    return null
  }
}

export async function ajouterClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'historique'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      historique: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Erreur ajouterClient:', error)
    throw new Error('Impossible d\'ajouter le client')
  }
}

export async function apurerCredit(clientId: string, montant: number): Promise<void> {
  console.log('🔄 Service apurerCredit appelé:', { clientId, montant })
  
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, COLLECTION, clientId)
      console.log('📄 Lecture du document client...')
      const docSnap = await transaction.get(docRef)

      if (!docSnap.exists()) {
        console.error('❌ Client introuvable:', clientId)
        throw new Error('Client introuvable')
      }

      const client = docSnap.data() as Client
      console.log('📊 Client actuel:', {
        nom: client.nom,
        creditEnCours: client.creditEnCours,
        nouveauCredit: Math.max(0, client.creditEnCours - montant)
      })
      
      const newCredit = Math.max(0, client.creditEnCours - montant)

      transaction.update(docRef, {
        creditEnCours: newCredit,
        statut: calculerStatut(newCredit, client.plafondCredit),
        updatedAt: serverTimestamp(),
      })
      
      console.log('✅ Transaction préparée, mise à jour:', { newCredit })
    })
    console.log('✅ Transaction committée avec succès')
  } catch (error) {
    console.error('❌ Erreur apurerCredit:', error)
    throw new Error(`Impossible d'apurer le crédit: ${(error as Error).message}`)
  }
}

export async function incrementerCredit(clientId: string, montant: number): Promise<void> {
  console.log('🔄 Service incrementerCredit appelé:', { clientId, montant })
  
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, COLLECTION, clientId)
      console.log('📄 Lecture du document client...')
      const docSnap = await transaction.get(docRef)

      if (!docSnap.exists()) {
        console.error('❌ Client introuvable:', clientId)
        throw new Error('Client introuvable')
      }

      const client = docSnap.data() as Client
      const newCredit = client.creditEnCours + montant

      console.log('📊 Vérification plafond:', {
        creditActuel: client.creditEnCours,
        montantAjoute: montant,
        nouveauCredit: newCredit,
        plafond: client.plafondCredit,
        depasse: newCredit > client.plafondCredit
      })

      if (newCredit > client.plafondCredit) {
        console.error('❌ Plafond dépassé!')
        throw new Error('PLAFOND_DEPASSE')
      }

      transaction.update(docRef, {
        creditEnCours: newCredit,
        statut: calculerStatut(newCredit, client.plafondCredit),
        updatedAt: serverTimestamp(),
      })
      
      console.log('✅ Transaction préparée, nouveau crédit:', newCredit)
    })
    console.log('✅ Transaction committée avec succès')
  } catch (error) {
    console.error('❌ Erreur incrementerCredit:', error)
    throw error
  }
}

export async function modifierPlafondCredit(clientId: string, plafond: number): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, COLLECTION, clientId)
      const docSnap = await transaction.get(docRef)

      if (!docSnap.exists()) {
        throw new Error('Client introuvable')
      }

      const client = docSnap.data() as Client

      transaction.update(docRef, {
        plafondCredit: plafond,
        statut: calculerStatut(client.creditEnCours, plafond),
        updatedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    console.error('Erreur modifierPlafondCredit:', error)
    throw new Error('Impossible de modifier le plafond')
  }
}
