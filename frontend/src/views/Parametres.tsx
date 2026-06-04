// frontend/src/views/Parametres.tsx
import React, { useState } from 'react'
import { Shield, User, Settings, Edit2, Save, X } from 'lucide-react'
import { Topbar } from '../components/Topbar'
import { Badge } from '../components/Badge'
import type { UserProfile, Client } from '../types/pos'

const fmt = (n: number) => Number(n).toLocaleString('fr-FR')

interface ParametresProps {
  userProfile:       UserProfile | null
  clients:           Client[]
  onUpdatePlafond?:  (clientId: string, plafond: number) => Promise<void>
}

export function Parametres({ userProfile, clients, onUpdatePlafond }: ParametresProps) {
  const [editPlafondId, setEditPlafondId] = useState<string | null>(null)
  const [newPlafond, setNewPlafond]       = useState('')
  const [loadingId, setLoadingId]         = useState<string | null>(null)
  const isGerant = userProfile?.role === 'gerant'

  const handleSavePlafond = async (clientId: string) => {
    const val = parseFloat(newPlafond)
    if (!val || val <= 0) return
    setLoadingId(clientId)
    try {
      await onUpdatePlafond?.(clientId, val)
      setEditPlafondId(null)
      setNewPlafond('')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Topbar
        titre="Paramètres"
        sous="Configuration système et gestion des accès"
      />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Profil utilisateur */}
        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] p-5">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
            <User size={15} className="text-[#ECC94B]" />
            Profil Utilisateur
          </h3>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: 'Nom',   value: userProfile?.displayName ?? '—' },
              { label: 'Email', value: userProfile?.email ?? '—' },
              { label: 'UID',   value: userProfile?.uid.slice(0, 12) + '...' ?? '—' },
              { label: 'Rôle',  value: userProfile?.role ?? '—' },
            ].map(item => (
              <div key={item.label} className="bg-[#1A365D]/60 rounded-lg p-3">
                <p className="text-slate-400 text-[10px] uppercase font-semibold mb-1">{item.label}</p>
                <p className="text-white text-xs font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rôles & Permissions — Exigences 11.1, 11.2, 11.3 */}
        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] p-5">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2 mb-4">
            <Shield size={15} className="text-[#ECC94B]" />
            Rôles & Permissions
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                role:    'gerant',
                label:   'Gérant',
                color:   'yellow',
                perms:   [
                  'Accès complet à toutes les vues',
                  'Modification des plafonds crédit',
                  'Rectification des ventes verrouillées (PIN)',
                  'Gestion des avaries et stocks',
                  'Consultation des rapports',
                ],
              },
              {
                role:    'caissier',
                label:   'Caissier',
                color:   'blue',
                perms:   [
                  'Accès Catalogue / POS',
                  'Enregistrement des ventes',
                  'Consultation de l\'historique',
                  'Interdit : modifier plafond crédit',
                  'Interdit : rectifier ventes verrouillées',
                ],
              },
            ].map(r => (
              <div
                key={r.role}
                className={`rounded-xl p-4 border ${userProfile?.role === r.role ? 'border-[#ECC94B] bg-[#ECC94B]/5' : 'border-[#4A5568] bg-[#1A365D]/20'}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Badge color={r.color as any}>{r.label}</Badge>
                  {userProfile?.role === r.role && (
                    <span className="text-[10px] text-[#ECC94B] font-semibold">← Votre rôle</span>
                  )}
                </div>
                <ul className="space-y-1">
                  {r.perms.map((p, i) => (
                    <li key={i} className={`text-[11px] flex items-start gap-1.5 ${p.startsWith('Interdit') ? 'text-red-400' : 'text-slate-300'}`}>
                      <span>{p.startsWith('Interdit') ? '✗' : '✓'}</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Gestion plafonds crédit — Exigence 11.2 */}
        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#4A5568] flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Settings size={14} className="text-[#ECC94B]" />
              Plafonds Crédit Clients
            </h3>
            {!isGerant && (
              <Badge color="red">Accès Gérant requis</Badge>
            )}
          </div>
          <div className="divide-y divide-[#4A5568]/40">
            {clients.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold">{c.nom}</p>
                  <p className="text-slate-400 text-[10px]">{c.telephone}</p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-slate-400 text-[10px]">Encours</p>
                  <p className="text-[#ECC94B] font-bold text-xs">{fmt(c.creditEnCours)} GNF</p>
                </div>
                <div className="flex items-center gap-2">
                  {editPlafondId === c.id ? (
                    <>
                      <input
                        type="number"
                        value={newPlafond}
                        onChange={e => setNewPlafond(e.target.value)}
                        placeholder={String(c.plafondCredit)}
                        className="w-28 bg-[#1A365D]/60 border border-[#ECC94B] text-white text-xs px-2 py-1 rounded-lg outline-none"
                      />
                      <button
                        onClick={() => handleSavePlafond(c.id)}
                        disabled={loadingId === c.id}
                        className="text-green-400 hover:text-green-300 cursor-pointer disabled:opacity-40"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        onClick={() => { setEditPlafondId(null); setNewPlafond('') }}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-white text-xs font-semibold w-28 text-right">
                        {fmt(c.plafondCredit)} GNF
                      </span>
                      {/* Exigence 11.2 : modification réservée au gérant */}
                      {isGerant && (
                        <button
                          onClick={() => {
                            setEditPlafondId(c.id)
                            setNewPlafond(String(c.plafondCredit))
                          }}
                          className="text-slate-400 hover:text-[#ECC94B] cursor-pointer transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info système */}
        <div className="bg-[#2D3748] rounded-xl border border-[#4A5568] p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Informations Système</h3>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 text-[11px]">
            {[
              { label: 'Version',        value: '1.0.0' },
              { label: 'Mode',           value: 'Mock (Firebase non connecté)' },
              { label: 'Firebase',       value: 'FIREBASE_READY = false' },
              { label: 'Stack',          value: 'React 19 + TypeScript + Tailwind CSS v4' },
              { label: 'Environnement',  value: 'Développement' },
              { label: 'Poissonnerie',   value: 'Tata — Conakry, Guinée' },
            ].map(item => (
              <div key={item.label} className="bg-[#1A365D]/40 rounded-lg px-3 py-2">
                <p className="text-slate-500 text-[10px]">{item.label}</p>
                <p className="text-slate-300 font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Parametres
