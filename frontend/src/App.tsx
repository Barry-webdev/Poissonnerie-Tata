// frontend/src/App.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Sidebar }    from './components/Sidebar'
import { Dashboard }  from './views/Dashboard'
import { Catalogue }  from './views/Catalogue'
import { Ventes }     from './views/Ventes'
import { Caisse }     from './views/Caisse'
import { Clients }    from './views/Clients'
import { StockFrigo } from './views/StockFrigo'
import { Avaries }    from './views/Avaries'
import { Parametres } from './views/Parametres'
import { Rapports }   from './views/Rapports'
import { useAuth }    from './hooks/useAuth'

import { getProduits, deduireStock, mettreAJourPAMP, ajouterProduit } from './services/produitService'
import { getVentes, ajouterVente }                    from './services/venteService'
import { getClients, incrementerCredit, apurerCredit, modifierPlafondCredit, ajouterClient } from './services/clientService'
import { getAvaries, ajouterAvarie }                  from './services/avariesService'

import type {
  Produit, Vente, Client, Avarie,
  CartItem, ModeReglement, StatutVente, LigneVente,
  AvariePayload,
} from './types/pos'

// ────────────────────────────────────────────────────────────────────────────
// App — composant racine
// ────────────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Auth ────────────────────────────────────────────────────
  const { user: userProfile, logout } = useAuth()

  // ── Navigation ──────────────────────────────────────────────
  const [activeView, setActiveView] = useState<string>('dashboard')

  // ── Données globales ─────────────────────────────────────────
  const [produits, setProduits] = useState<Produit[]>([])
  const [ventes,   setVentes]   = useState<Vente[]>([])
  const [clients,  setClients]  = useState<Client[]>([])
  const [avaries,  setAvaries]  = useState<Avarie[]>([])

  // ── État du panier ────────────────────────────────────────────
  const [panier,              setPanier]              = useState<CartItem[]>([])
  const [clientSelectionne,   setClientSelectionne]   = useState<Client | null>(null)
  const [modeReglement,       setModeReglement]       = useState<ModeReglement>('Espèces')
  const [encaissement,        setEncaissement]        = useState<string>('')

  // ── États UI ──────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // ── Chargement initial ────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [p, v, c, a] = await Promise.all([
          getProduits(),
          getVentes(),
          getClients(),
          getAvaries(),
        ])
        setProduits(p)
        setVentes(v)
        setClients(c)
        setAvaries(a)
      } catch (err) {
        console.error('Erreur chargement données:', err)
      }
    }
    loadData()
  }, [])

  // ── Rechargement données après modification ───────────────────
  const reloadData = useCallback(async () => {
    const [p, v, c, a] = await Promise.all([
      getProduits(),
      getVentes(),
      getClients(),
      getAvaries(),
    ])
    setProduits(p)
    setVentes(v)
    setClients(c)
    setAvaries(a)
  }, [])

  // ── Nombre d'alertes pour la topbar ──────────────────────────
  const alertCount = useMemo(
    () => produits.filter(p => p.stockCart <= p.seuilAlerte).length,
    [produits]
  )

  // ── Validation d'une vente ────────────────────────────────────
  // Propriétés 1, 2, 3, 8 — Exigences 4.1 à 4.6
  const handleValidateSale = useCallback(async (): Promise<void> => {
    if (panier.length === 0) return
    setError(null)

    // 1. Calcul des totaux (Propriété 8)
    const totalNet        = panier.reduce((s, i) => s + i.qte * i.prixUnit, 0)
    const montantEncaisse = parseFloat(encaissement) || 0
    const resteAPayer     = Math.max(0, totalNet - montantEncaisse)

    // Déterminer le statut — Exigence 4.6
    const statut: StatutVente =
      resteAPayer === 0        ? 'payé'    :
      modeReglement === 'Crédit' ? 'crédit' : 'partiel'

    // 2. Vérification plafond crédit (Propriété 3) — Exigence 3.4
    if (modeReglement === 'Crédit' && clientSelectionne) {
      const disponible = clientSelectionne.plafondCredit - clientSelectionne.creditEnCours
      if (resteAPayer > disponible) {
        setError('Plafond crédit dépassé pour ce client')
        return
      }
    }

    setLoading(true)
    try {
      // 3. Construire les lignes de vente
      const lignes: LigneVente[] = panier.map(i => ({
        produitId:  i.produitId,
        produitNom: i.nom,
        type:       i.type,
        qte:        i.qte,
        prixUnit:   i.prixUnit,
        total:      i.qte * i.prixUnit,
      }))

      // 4. Déduction atomique du stock (Propriété 1) — Exigences 4.2, 4.3
      await deduireStock(lignes)

      // 5. Enregistrement de la vente verrouillée — Exigence 4.1
      await ajouterVente({
        clientId:        clientSelectionne?.id ?? null,
        clientNom:       clientSelectionne?.nom ?? 'Client anonyme',
        lignes,
        totalNet,
        modeReglement,
        montantEncaisse,
        resteAPayer,
        caissier:        userProfile?.displayName ?? 'Caissier',
        statut,
      })

      // 6. Mise à jour crédit client si vente à crédit — Exigence 4.4
      if (modeReglement === 'Crédit' && clientSelectionne && resteAPayer > 0) {
        await incrementerCredit(clientSelectionne.id, resteAPayer)
      }

      // 7. Reset panier — Exigence 4.5
      setPanier([])
      setEncaissement('')
      setClientSelectionne(null)

      // 8. Rechargement des données
      await reloadData()

    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [
    panier, encaissement, modeReglement, clientSelectionne,
    userProfile, reloadData,
  ])

  // ── Apurement crédit ──────────────────────────────────────────
  const handleApurerCredit = useCallback(async (clientId: string, montant: number): Promise<void> => {
    await apurerCredit(clientId, montant)
    await reloadData()
  }, [reloadData])

  // ── Ajout d'avarie ────────────────────────────────────────────
  const handleAjouterAvarie = useCallback(async (payload: AvariePayload): Promise<void> => {
    // Déduire le stock via deduireStock (mock atomique dans le service)
    const lignes: LigneVente[] = []
    if (payload.qteCart > 0) {
      lignes.push({
        produitId:  payload.produitId,
        produitNom: payload.produitNom,
        type:       'Carton',
        qte:        payload.qteCart,
        prixUnit:   0,
        total:      0,
      })
    }
    if (payload.poidsKg > 0) {
      lignes.push({
        produitId:  payload.produitId,
        produitNom: payload.produitNom,
        type:       'Kg',
        qte:        payload.poidsKg,
        prixUnit:   0,
        total:      0,
      })
    }
    if (lignes.length > 0) await deduireStock(lignes)

    await ajouterAvarie(payload)
    await reloadData()
  }, [reloadData])

  // ── Modifier plafond crédit ───────────────────────────────────
  const handleUpdatePlafond = useCallback(async (clientId: string, plafond: number): Promise<void> => {
    await modifierPlafondCredit(clientId, plafond)
    await reloadData()
  }, [reloadData])

  // ── Modifier stock (réappro) ──────────────────────────────────
  const handleModifierStock = useCallback(async (
    id: string,
    qteAchatCart: number,
    prixAchatCart: number
  ): Promise<void> => {
    await mettreAJourPAMP(id, qteAchatCart, prixAchatCart)
    await reloadData()
  }, [reloadData])

  // ── Ajouter un nouveau client ────────────────────────────────
  const handleAjouterClient = useCallback(async (
    data: Omit<import('./types/pos').Client, 'id' | 'createdAt' | 'updatedAt' | 'historique'>
  ): Promise<void> => {
    await ajouterClient(data)
    await reloadData()
  }, [reloadData])

  // ── Ajouter un nouveau produit ────────────────────────────────
  const handleAjouterProduit = useCallback(async (
    data: Omit<Produit, 'id' | 'updatedAt'>
  ): Promise<void> => {
    await ajouterProduit(data)
    await reloadData()
  }, [reloadData])

  // ── Rendu ─────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-[#4A5568] text-white" style={{ fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif" }}>
      {/* Sidebar — Exigences 15.1, 15.4 */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        userProfile={userProfile}
        onLogout={logout}
      />

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Bannière erreur */}
        {error && (
          <div className="bg-red-900/80 border-b border-red-700 text-red-200 text-xs px-5 py-2.5 flex items-center justify-between shrink-0">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-white cursor-pointer ml-4 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Routing par état */}
        {activeView === 'dashboard' && (
          <Dashboard
            produits={produits}
            ventes={ventes}
            clients={clients}
          />
        )}

        {activeView === 'catalogue' && (
          <Catalogue
            produits={produits}
            clients={clients}
            panier={panier}
            setPanier={setPanier}
            clientSelectionne={clientSelectionne}
            setClientSelectionne={setClientSelectionne}
            modeReglement={modeReglement}
            setModeReglement={setModeReglement}
            encaissement={encaissement}
            setEncaissement={setEncaissement}
            onValiderVente={handleValidateSale}
            onAjouterProduit={handleAjouterProduit}
            loading={loading}
            alertCount={alertCount}
          />
        )}

        {activeView === 'ventes' && (
          <Ventes ventes={ventes} />
        )}

        {activeView === 'caisse' && (
          <Caisse ventes={ventes} />
        )}

        {activeView === 'clients' && (
          <Clients
            clients={clients}
            onApurerCredit={handleApurerCredit}
            onAjouterClient={handleAjouterClient}
          />
        )}

        {activeView === 'frigo' && (
          <StockFrigo
            produits={produits}
            onModifierStock={handleModifierStock}
            onAjouterProduit={handleAjouterProduit}
          />
        )}

        {activeView === 'avaries' && (
          <Avaries
            produits={produits}
            avaries={avaries}
            onAjouterAvarie={handleAjouterAvarie}
          />
        )}

        {activeView === 'rapports' && (
          <Rapports
            produits={produits}
            ventes={ventes}
            clients={clients}
          />
        )}

        {activeView === 'parametres' && (
          <Parametres
            userProfile={userProfile}
            clients={clients}
            onUpdatePlafond={handleUpdatePlafond}
          />
        )}
      </main>
    </div>
  )
}
