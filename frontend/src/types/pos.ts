// frontend/src/types/pos.ts

// ── Entités Firestore ────────────────────────────────────────

export type ModeReglement    = 'Espèces' | 'Virement' | 'Crédit'
export type StatutVente      = 'payé' | 'crédit' | 'partiel' | 'retard'
export type StatutClient     = 'actif' | 'retard' | 'bloque'
export type TypeUnite        = 'Carton' | 'Kg'
export type RoleUser         = 'gerant' | 'caissier'
export type CategoriePoisson = 'Pélagique' | 'Démersal' | 'Fumé' | string

export interface Produit {
  id:          string
  nom:         string
  categorie:   CategoriePoisson
  stockCart:   number
  stockKg:     number
  kgParCarton: number
  prixCart:    number        // GNF
  prixKg:      number        // GNF
  pampCart:    number        // Prix Achat Moyen Pondéré / carton
  seuilAlerte: number
  emoji:       string
  actif:       boolean
  updatedAt?:  Date
}

export interface LigneVente {
  produitId:  string
  produitNom: string
  type:       TypeUnite
  qte:        number
  prixUnit:   number         // GNF
  total:      number         // qte * prixUnit
}

export interface Vente {
  id:              string
  date:            Date
  dateStr:         string    // "YYYY-MM-DD"
  clientId:        string | null
  clientNom:       string
  lignes:          LigneVente[]
  totalNet:        number
  modeReglement:   ModeReglement
  montantEncaisse: number
  resteAPayer:     number
  caissier:        string
  statut:          StatutVente
  locked:          boolean
  modifiePar:      string | null
  modifieAt:       Date | null
}

export interface HistoriqueClient {
  venteId: string
  date:    Date
  montant: number
  type:    'achat' | 'paiement'
}

export interface Client {
  id:            string
  nom:           string
  telephone:     string
  creditEnCours: number      // GNF dette active
  plafondCredit: number      // GNF limite
  statut:        StatutClient
  historique:    HistoriqueClient[]
  createdAt?:    Date
  updatedAt?:    Date
}

export interface Avarie {
  id:           string
  date:         Date
  dateStr:      string
  produitId:    string
  produitNom:   string
  qteCart:      number
  poidsKg:      number
  motif:        string       // non vide — obligatoire
  valeurPerdue: number       // GNF
  validePar:    string
  createdAt?:   Date
}

export interface UserProfile {
  uid:         string
  displayName: string
  role:        RoleUser
  email:       string
}

// ── State du panier ──────────────────────────────────────────

export interface CartItem {
  produitId: string
  nom:       string
  type:      TypeUnite
  qte:       number
  prixUnit:  number          // GNF (prixCart ou prixKg selon type)
  total:     number          // qte * prixUnit
}

// ── Props des composants ─────────────────────────────────────

export interface SidebarProps {
  activeView:    string
  setActiveView: (view: string) => void
  userProfile:   UserProfile | null
  onLogout:      () => void
}

export interface TopbarProps {
  titre:         string
  sous?:         string
  recherche?:    string
  setRecherche?: (v: string) => void
  showSearch?:   boolean
  alertCount?:   number
}

export interface ProductCardProps {
  produit:   Produit
  onAjouter: (produit: Produit, type: TypeUnite) => void
}

export interface CartSectionProps {
  items:                CartItem[]
  clients:              Client[]
  clientSelectionne:    Client | null
  setClientSelectionne: (c: Client | null) => void
  modeReglement:        ModeReglement
  setModeReglement:     (m: ModeReglement) => void
  encaissement:         string
  setEncaissement:      (v: string) => void
  onQteChange:          (produitId: string, type: TypeUnite, delta: number) => void
  onSupprimer:          (produitId: string, type: TypeUnite) => void
  onValider:            () => Promise<void>
  loading:              boolean
}

export interface StatsFooterProps {
  produits: Produit[]
  ventes:   Vente[]
}

// ── Payload service ──────────────────────────────────────────

export interface VentePayload {
  clientId:        string | null
  clientNom:       string
  lignes:          LigneVente[]
  totalNet:        number
  modeReglement:   ModeReglement
  montantEncaisse: number
  resteAPayer:     number
  caissier:        string
  statut:          StatutVente
}

export interface AvariePayload {
  produitId:    string
  produitNom:   string
  qteCart:      number
  poidsKg:      number
  motif:        string
  valeurPerdue: number
  validePar:    string
}

// ── KPI Dashboard ────────────────────────────────────────────

export interface KPIData {
  caisseJour:     number     // Espèces + Virement du jour
  nbVentesJour:   number
  margeEstimee:   number
  creditsActifs:  number     // Nombre de clients en crédit/retard
  creditsMontant: number     // Somme des creditEnCours
  stockKgTotal:   number
  alertesStock:   number     // Produits sous seuilAlerte
}
