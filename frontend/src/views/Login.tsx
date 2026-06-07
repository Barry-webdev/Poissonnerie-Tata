// frontend/src/views/Login.tsx
import React, { useState, useEffect } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'
import logoTata from '../assets/logo.jpeg'
import { LogIn, AlertCircle, CheckCircle } from 'lucide-react'

export function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      console.log('✅ Utilisateur connecté détecté dans Login:', user)
      setSuccess(true)
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setSuccess(false)

    console.log('🔐 Tentative de connexion avec:', email)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      console.log('✅ Connexion Firebase Auth réussie:', userCredential.user.uid)
      console.log('⏳ En attente du chargement du profil Firestore...')
      
      setSuccess(true)
      // La redirection sera automatique via App.tsx quand useAuth détecte l'utilisateur
    } catch (err: any) {
      console.error('❌ Erreur connexion:', err)
      
      // Messages d'erreur en français
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Email ou mot de passe incorrect')
          break
        case 'auth/too-many-requests':
          setError('Trop de tentatives. Réessayez plus tard.')
          break
        case 'auth/network-request-failed':
          setError('Erreur réseau. Vérifiez votre connexion.')
          break
        case 'auth/invalid-email':
          setError('Format d\'email invalide')
          break
        default:
          setError(`Erreur de connexion : ${err.message}`)
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A365D] via-[#2D3748] to-[#4A5568] p-4">
      <div className="w-full max-w-md">
        {/* Logo & Titre */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoTata} alt="Logo Poissonnerie Tata" className="w-20 h-20 rounded-2xl shadow-2xl" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-1">Poissonnerie TATA</h1>
          <p className="text-[#ECC94B] text-sm font-semibold">Système de Gestion ERP</p>
        </div>

        {/* Carte de connexion */}
        <div className="bg-[#2D3748] rounded-2xl shadow-2xl p-8 border border-[#4A5568]">
          <h2 className="text-white text-xl font-bold mb-6 flex items-center gap-2">
            <LogIn size={20} className="text-[#ECC94B]" />
            Connexion
          </h2>

          {/* Message de succès */}
          {success && (
            <div className="mb-4 bg-green-900/50 border border-green-700/50 text-green-300 text-xs px-3 py-2.5 rounded-lg flex items-start gap-2">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>Connexion réussie ! Chargement du profil...</span>
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700/50 text-red-300 text-xs px-3 py-2.5 rounded-lg flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@poissonnerie-tata.com"
                required
                disabled={loading || success}
                className="w-full bg-[#1A365D] border border-[#4A5568] focus:border-[#ECC94B] text-white text-sm px-4 py-3 rounded-lg outline-none placeholder:text-slate-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-semibold mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading || success}
                className="w-full bg-[#1A365D] border border-[#4A5568] focus:border-[#ECC94B] text-white text-sm px-4 py-3 rounded-lg outline-none placeholder:text-slate-500 transition-colors disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-[#ECC94B] hover:bg-amber-500 text-[#1A365D] font-extrabold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading || success ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-[#1A365D]/30 border-t-[#1A365D] rounded-full animate-spin" />
                  {success ? 'Chargement du profil...' : 'Connexion en cours...'}
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Se connecter
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6">
          © 2026 Poissonnerie Tata — Tous droits réservés
        </p>
      </div>
    </div>
  )
}

export default Login
