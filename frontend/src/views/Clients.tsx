import React, { useState, useMemo } from 'react'
import { Search, Plus, CheckCircle, Users, X, Printer } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Badge } from '../components/Badge'
import { imprimerRecuApurement } from '../utils/impression'
import type { Client } from '../types/pos'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

interface ClientsProps {
  clients:          Client[]
  onApurerCredit:   (clientId: string, montant: number) => Promise<void>
  onAjouterClient?: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'historique'>) => Promise<void>
}

const FORM_INIT = { nom: '', telephone: '', plafondCredit: '1000000' }

export function Clients({ clients, onApurerCredit, onAjouterClient }: ClientsProps) {
  const [recherche, setRecherche] = useState('')
  const [paiements, setPaiements] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(FORM_INIT)
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState('')

  const clientsFiltres = useMemo(
    () => clients.filter(c =>
      c.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      c.telephone.includes(recherche)
    ),
    [clients, recherche]
  )

  // Calcul du total crédit : somme des creditEnCours de tous les clients
  const totalCredit = useMemo(() => clients.reduce((s, c) => s + c.creditEnCours, 0), [clients])
  
  // Nombre de clients en retard/bloqué
  const clientsEnRetard = useMemo(() => clients.filter(c => c.statut !== 'actif').length, [clients])

  const handleApurer = async (id: string, withPrint: boolean = false) => {
    const montant = parseFloat(paiements[id] || '0')
    if (!montant || montant <= 0) {
      console.warn('⚠️ Montant invalide:', montant)
      return
    }
    
    // Trouver le client et stocker son état AVANT l'apurement
    const client = clients.find(c => c.id === id)
    if (!client) {
      console.error('❌ Client introuvable:', id)
      return
    }
    
    const creditAvant = client.creditEnCours
    const creditApres = Math.max(0, creditAvant - montant)
    
    console.log('💵 Début apurement:', { clientId: id, montant, creditAvant, creditApres })
    setLoadingId(id)
    
    try {
      await onApurerCredit(id, montant)
      console.log('✅ Apurement terminé avec succès')
      
      // Imprimer le reçu si demandé
      if (withPrint) {
        console.log('🖨️ Impression du reçu d\'apurement...')
        imprimerRecuApurement(client, montant, creditAvant, creditApres)
      }
      
      setPaiements(prev => ({ ...prev, [id]: '' }))
    } catch (error) {
      console.error('❌ Erreur lors de l\'apurement:', error)
      alert(`Erreur: ${(error as Error).message}`)
    } finally {
      setLoadingId(null)
    }
  }

  const handleSaveClient = async () => {
    setFormErr('')
    if (!form.nom.trim()) { setFormErr('Le nom est obligatoire'); return }
    const plafond = parseFloat(form.plafondCredit)
    if (!plafond || plafond <= 0) { setFormErr('Le plafond doit être supérieur à 0'); return }

    setSaving(true)
    try {
      await onAjouterClient?.({
        nom:           form.nom.trim(),
        telephone:     form.telephone.trim(),
        creditEnCours: 0,
        plafondCredit: plafond,
        statut:        'actif',
      })
      setForm(FORM_INIT)
      setShowForm(false)
    } catch (e) {
      setFormErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar titre="Clients & Crédits" sous="Gestion des encours et remboursements" recherche={recherche} setRecherche={setRecherche} showSearch />

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* KPI */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total clients',    value: clients.length,      color: 'text-white' },
            { label: 'En retard/bloqué', value: clientsEnRetard,     color: 'text-[#ECC94B]' },
            { label: 'Encours total',    value: `${fmt(totalCredit)} GNF`, color: 'text-red-400' },
          ].map(item => (
            <div key={item.label} className="bg-[#2D3748] rounded-xl p-4 border border-[#4A5568] flex items-center gap-3">
              <Users size={18} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-400 text-[11px]">{item.label}</p>
                <p className={`font-extrabold text-sm ${item.color}`}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Barre outils */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowForm(f => !f); setFormErr('') }}
            className="flex items-center gap-1.5 bg-[#ECC94B] hover:bg-amber-500 text-[#1A365D] text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ml-auto"
          >
            <Plus size={12} /> Nouveau Client
          </button>
        </div>

        {/* Formulaire nouveau client */}
        {showForm && (
          <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Nouveau Client</h3>
              <button onClick={() => { setShowForm(false); setFormErr('') }} className="text-slate-400 hover:text-white cursor-pointer"><X size={15} /></button>
            </div>

            {formErr && <div className="bg-red-900/40 border border-red-700/40 text-red-400 text-xs px-3 py-2 rounded-lg">⚠️ {formErr}</div>}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-slate-400 text-[10px] mb-1">Nom *</p>
                <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Amadou Diallo"
                  className="w-full bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none placeholder:text-slate-500" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] mb-1">Téléphone</p>
                <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))}
                  placeholder="621 000 000"
                  className="w-full bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none placeholder:text-slate-500" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] mb-1">Plafond crédit (GNF)</p>
                <input type="number" value={form.plafondCredit} onChange={e => setForm(p => ({ ...p, plafondCredit: e.target.value }))}
                  className="w-full bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); setForm(FORM_INIT); setFormErr('') }}
                className="px-4 py-1.5 rounded-lg text-xs text-slate-300 bg-[#4A5568] hover:bg-slate-600 cursor-pointer">Annuler</button>
              <button onClick={handleSaveClient} disabled={saving}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#ECC94B] text-[#1A365D] hover:bg-amber-500 disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
                {saving ? <span className="inline-block w-3 h-3 border-2 border-[#1A365D]/30 border-t-[#1A365D] rounded-full animate-spin" /> : <Plus size={11} />}
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* Fiches clients */}
        <div className="space-y-3">
          {clientsFiltres.map(c => {
            const pct = Math.min(100, Math.round((c.creditEnCours / c.plafondCredit) * 100))
            return (
              <div key={c.id} className={`bg-[#2D3748] rounded-xl p-4 border ${c.statut !== 'actif' ? 'border-yellow-700/50' : 'border-[#4A5568]'}`}>
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold text-sm">{c.nom}</p>
                      <Badge color={c.statut === 'actif' ? 'green' : c.statut === 'retard' ? 'yellow' : 'red'}>{c.statut}</Badge>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{c.telephone}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Crédit en cours</span>
                        <span className={`font-bold ${pct >= 100 ? 'text-red-400' : pct >= 80 ? 'text-[#ECC94B]' : 'text-green-400'}`}>{pct}%</span>
                      </div>
                      <div className="bg-[#1A365D] rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-[#ECC94B]' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{fmt(c.creditEnCours)} GNF</span>
                        <span>/ {fmt(c.plafondCredit)} GNF</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end gap-2 shrink-0">
                    <div>
                      <p className="text-slate-400 text-[10px] mb-1">Montant versé (GNF)</p>
                      <input type="number" value={paiements[c.id] ?? ''} onChange={e => setPaiements(prev => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="Ex: 200000"
                        className="w-36 bg-[#1A365D]/60 border border-[#4A5568] focus:border-[#ECC94B] text-white text-xs px-3 py-1.5 rounded-lg outline-none placeholder:text-slate-500" />
                    </div>
                    <button onClick={() => handleApurer(c.id, false)} disabled={!paiements[c.id] || loadingId === c.id}
                      className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                      <CheckCircle size={12} />
                      {loadingId === c.id ? '...' : 'Apurer'}
                    </button>
                    <button onClick={() => handleApurer(c.id, true)} disabled={!paiements[c.id] || loadingId === c.id}
                      className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                      title="Apurer et imprimer le reçu">
                      <Printer size={12} />
                      {loadingId === c.id ? '...' : 'Apurer + Reçu'}
                    </button>
                  </div>
                </div>

                {c.historique.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#4A5568]/40">
                    <p className="text-slate-400 text-[10px] uppercase font-semibold mb-2">Historique</p>
                    {c.historique.slice(0, 3).map((h, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-slate-300">
                        <span>{h.type === 'achat' ? '📦 Achat' : '✅ Paiement'}</span>
                        <span className={h.type === 'paiement' ? 'text-green-400' : 'text-[#ECC94B]'}>
                          {h.type === 'paiement' ? '+' : '-'}{fmt(h.montant)} GNF
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {clientsFiltres.length === 0 && <div className="text-center py-10 text-slate-500 text-sm">Aucun client trouvé</div>}
        </div>
      </div>
    </div>
  )
}

export default Clients
