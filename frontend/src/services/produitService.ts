import { collection, doc, getDocs, getDoc, addDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Produit, LigneVente } from '../types/pos'

const COLLECTION = 'produits'

// Convertir Timestamp Firebase en Date
function toDate(timestamp: any): Date | undefined {
  if (!timestamp) return undefined
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
}

export async function getProduits(): Promise<Produit[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION))
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: toDate(doc.data().updatedAt),
    })) as Produit[]
  } catch (error) {
    console.error('Erreur getProduits:', error)
    throw new Error('Impossible de charger les produits')
  }
}

export async function getProduitById(id: string): Promise<Produit | null> {
  try {
    const docRef = doc(db, COLLECTION, id)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) return null
    return {
      id: docSnap.id,
      ...docSnap.data(),
      updatedAt: toDate(docSnap.data().updatedAt),
    } as Produit
  } catch (error) {
    console.error('Erreur getProduitById:', error)
    return null
  }
}

export async function ajouterProduit(data: Omit<Produit, 'id' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Erreur ajouterProduit:', error)
    throw new Error('Impossible d\'ajouter le produit')
  }
}

export async function modifierProduit(id: string, delta: Partial<Omit<Produit, 'id'>>): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, id)
    await updateDoc(docRef, {
      ...delta,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Erreur modifierProduit:', error)
    throw new Error('Impossible de modifier le produit')
  }
}

// Déduction atomique du stock avec transaction Firestore
export async function deduireStock(lignes: LigneVente[]): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Lire tous les produits concernés
      const produitsRefs = lignes.map(l => doc(db, COLLECTION, l.produitId))
      const produitsSnaps = await Promise.all(produitsRefs.map(ref => transaction.get(ref)))

      // 2. Vérifier les stocks
      for (let i = 0; i < lignes.length; i++) {
        const ligne = lignes[i]
        const snap = produitsSnaps[i]
        
        if (!snap.exists()) {
          throw new Error(`Produit ${ligne.produitNom} introuvable`)
        }

        const produit = snap.data() as Produit
        if (ligne.type === 'Carton' && produit.stockCart < ligne.qte) {
          throw new Error(`Stock insuffisant — ${ligne.produitNom} (${produit.stockCart} cartons restants)`)
        }
        if (ligne.type === 'Kg' && produit.stockKg < ligne.qte) {
          throw new Error(`Stock insuffisant — ${ligne.produitNom} (${produit.stockKg} kg restants)`)
        }
      }

      // 3. Déduire le stock
      for (let i = 0; i < lignes.length; i++) {
        const ligne = lignes[i]
        const ref = produitsRefs[i]
        const produit = produitsSnaps[i].data() as Produit

        const newStock = {
          stockCart: ligne.type === 'Carton' ? produit.stockCart - ligne.qte : produit.stockCart,
          stockKg: ligne.type === 'Kg' ? produit.stockKg - ligne.qte : produit.stockKg,
          updatedAt: serverTimestamp(),
        }

        transaction.update(ref, newStock)
      }
    })
  } catch (error) {
    console.error('Erreur deduireStock:', error)
    throw error
  }
}

// Mise à jour du PAMP avec réapprovisionnement
export async function mettreAJourPAMP(id: string, qteAchat: number, prixAchat: number): Promise<void> {
  try {
    await runTransaction(db, async (transaction) => {
      const docRef = doc(db, COLLECTION, id)
      const docSnap = await transaction.get(docRef)

      if (!docSnap.exists()) {
        throw new Error('Produit introuvable')
      }

      const produit = docSnap.data() as Produit
      const newPamp = (produit.stockCart * produit.pampCart + qteAchat * prixAchat) / (produit.stockCart + qteAchat)

      transaction.update(docRef, {
        stockCart: produit.stockCart + qteAchat,
        stockKg: (produit.stockCart + qteAchat) * produit.kgParCarton,
        pampCart: Math.round(newPamp),
        updatedAt: serverTimestamp(),
      })
    })
  } catch (error) {
    console.error('Erreur mettreAJourPAMP:', error)
    throw new Error('Impossible de mettre à jour le PAMP')
  }
}
