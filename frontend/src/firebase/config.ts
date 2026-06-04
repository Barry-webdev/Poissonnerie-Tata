// firebase/config.ts
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Configuration Firebase depuis variables d'environnement
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_MEASUREMENT_ID,
}

// Vérification de la configuration
console.log('🔥 Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
})

// Initialisation Firebase
let app: FirebaseApp
try {
  app = initializeApp(firebaseConfig)
  console.log('✅ Firebase initialisé avec succès')
} catch (error) {
  console.error('❌ Erreur initialisation Firebase:', error)
  throw error
}

export const db = getFirestore(app)
export const auth = getAuth(app)

// Log pour confirmer que Firestore est initialisé
console.log('✅ Firestore et Auth initialisés')
