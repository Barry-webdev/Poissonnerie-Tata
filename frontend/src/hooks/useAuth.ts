import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { UserProfile } from '../types/pos'

export function useAuth(): { user: UserProfile | null; loading: boolean; logout: () => Promise<void> } {
  const [user, setUser]       = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser?.email || 'Not logged in')
      
      if (firebaseUser) {
        try {
          console.log('📄 Tentative de récupération du profil:', firebaseUser.uid)
          
          // Récupérer le profil utilisateur depuis Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          const userDoc = await getDoc(userDocRef)
          
          console.log('📄 Document existe?', userDoc.exists())
          
          if (userDoc.exists()) {
            const data = userDoc.data()
            console.log('✅ Profil chargé depuis Firestore:', data)
            
            setUser({
              uid:         firebaseUser.uid,
              displayName: data.displayName || firebaseUser.displayName || 'Utilisateur',
              email:       firebaseUser.email || '',
              role:        data.role || 'caissier',
            })
          } else {
            // Document n'existe pas → Bloquer la connexion et demander la création
            console.error('❌ PROFIL MANQUANT dans Firestore')
            console.error('📋 Crée ce document dans Firebase Console :')
            console.error('   Collection: users')
            console.error('   Document ID:', firebaseUser.uid)
            console.error('   Champs:')
            console.error('     - displayName (string): "Admin Tata"')
            console.error('     - email (string):', firebaseUser.email)
            console.error('     - role (string): "gerant"')
            
            // Déconnecter l'utilisateur
            await signOut(auth)
            setUser(null)
            
            alert(`❌ Profil utilisateur non configuré\n\nVa dans Firebase Console → Firestore et crée le document:\n\nCollection: users\nDocument ID: ${firebaseUser.uid}\nChamps:\n  - displayName: "Admin Tata"\n  - email: ${firebaseUser.email}\n  - role: "gerant"`)
          }
        } catch (error: any) {
          console.error('❌ Erreur chargement profil:', error)
          console.error('Code erreur:', error.code)
          console.error('Message:', error.message)
          
          if (error.code === 'permission-denied') {
            console.error('💡 SOLUTION: Vérifie les règles Firestore')
            alert('❌ Accès refusé à Firestore\n\nVérifie les règles Firestore dans Firebase Console')
          }
          
          // Déconnecter en cas d'erreur
          await signOut(auth)
          setUser(null)
        }
      } else {
        console.log('👤 Pas d\'utilisateur connecté')
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    try {
      await signOut(auth)
      setUser(null)
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    }
  }

  return { user, loading, logout }
}
