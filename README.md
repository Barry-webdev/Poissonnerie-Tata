# 🐟 Poissonnerie TATA — Système ERP

Application de gestion complète pour poissonnerie avec point de vente, gestion de stock, crédits clients et rapports.

## 🎯 Fonctionnalités

✅ **Point de Vente (POS)**
- Catalogue produits avec recherche et filtres
- Panier temps réel
- Vente au carton ou au kg
- Modes de règlement : Espèces, Virement, Crédit

✅ **Gestion de Stock**
- Alertes de rupture automatiques
- Prix Achat Moyen Pondéré (PAMP)
- Réapprovisionnement avec mise à jour du PAMP
- Suivi des avaries avec motif obligatoire

✅ **Gestion Clients**
- Fiche client avec historique
- Plafond de crédit personnalisé
- Alertes crédit dépassé
- Apurement de crédit

✅ **Rapports & Analyses**
- Dashboard avec KPI en temps réel
- Caisse journalière
- Marge estimée
- Balance des crédits
- Historique des ventes

✅ **Sécurité**
- Authentification Firebase
- Ventes verrouillées (immuables)
- Déverrouillage par PIN admin uniquement
- Rôles : Gérant / Caissier

---

## 🚀 Installation Rapide

### 1. Cloner le projet

```bash
git clone <URL_DU_REPO>
cd Poissonnerie-Tata/frontend
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer Firebase

Suis le guide complet : **[GUIDE_INTEGRATION_FIREBASE.md](./GUIDE_INTEGRATION_FIREBASE.md)**

En résumé :
1. Crée un projet Firebase
2. Active Firestore + Authentication
3. Copie les config dans `.env.local`
4. Configure les règles Firestore
5. Crée les utilisateurs

### 4. Lancer l'application

```bash
npm run dev
```

L'app sera accessible sur **http://localhost:5173**

---

## 📁 Structure du Projet

```
frontend/
├── src/
│   ├── assets/           # Images et logos
│   ├── components/       # Composants réutilisables
│   │   ├── Badge.tsx
│   │   ├── CartSection.tsx
│   │   ├── ProductCard.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StatsFooter.tsx
│   │   └── Topbar.tsx
│   ├── firebase/
│   │   └── config.ts     # Configuration Firebase
│   ├── hooks/
│   │   └── useAuth.ts    # Hook d'authentification
│   ├── services/         # Services Firestore
│   │   ├── produitService.ts
│   │   ├── venteService.ts
│   │   ├── clientService.ts
│   │   └── avariesService.ts
│   ├── types/
│   │   └── pos.ts        # Types TypeScript
│   ├── utils/
│   │   └── impression.ts # Fonctions d'impression
│   ├── views/            # Pages principales
│   │   ├── Avaries.tsx
│   │   ├── Caisse.tsx
│   │   ├── Catalogue.tsx
│   │   ├── Clients.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Login.tsx
│   │   ├── Parametres.tsx
│   │   ├── Rapports.tsx
│   │   ├── StockFrigo.tsx
│   │   └── Ventes.tsx
│   ├── App.tsx           # Composant racine
│   ├── main.tsx          # Point d'entrée
│   └── index.css         # Styles Tailwind
├── .env.local            # Variables d'environnement (à créer)
├── .env.example          # Template des variables
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🔥 Technologies

- **React 19** avec TypeScript
- **Firebase** (Auth + Firestore)
- **Tailwind CSS 4**
- **Vite 8**
- **Lucide React** (icônes)

---

## 👥 Comptes par Défaut

### Gérant
- Email : `admin@poissonnerie-tata.com`
- Mot de passe : `TataAdmin2026!`
- Permissions : Toutes

### Caissier
- Email : `caissier@poissonnerie-tata.com`
- Mot de passe : `TataCaisse2026!`
- Permissions : Ventes, Catalogue, Dashboard

---

## 📊 Collections Firestore

### `produits`
```javascript
{
  nom: string
  categorie: "Pélagique" | "Démersal" | "Fumé"
  stockCart: number
  stockKg: number
  kgParCarton: number
  prixCart: number      // GNF
  prixKg: number        // GNF
  pampCart: number      // Prix Achat Moyen Pondéré
  seuilAlerte: number
  emoji: string
  actif: boolean
  updatedAt: Timestamp
}
```

### `ventes`
```javascript
{
  date: Timestamp
  dateStr: string       // "YYYY-MM-DD"
  clientId: string | null
  clientNom: string
  lignes: Array<{
    produitId: string
    produitNom: string
    type: "Carton" | "Kg"
    qte: number
    prixUnit: number
    total: number
  }>
  totalNet: number
  modeReglement: "Espèces" | "Virement" | "Crédit"
  montantEncaisse: number
  resteAPayer: number
  caissier: string
  statut: "payé" | "crédit" | "partiel" | "retard"
  locked: boolean       // Vente verrouillée (immuable)
  modifiePar: string | null
  modifieAt: Timestamp | null
}
```

### `clients`
```javascript
{
  nom: string
  telephone: string
  creditEnCours: number   // GNF
  plafondCredit: number   // GNF
  statut: "actif" | "retard" | "bloque"
  historique: Array<{
    venteId: string
    date: Timestamp
    montant: number
    type: "achat" | "paiement"
  }>
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### `avaries`
```javascript
{
  date: Timestamp
  dateStr: string
  produitId: string
  produitNom: string
  qteCart: number
  poidsKg: number
  motif: string         // OBLIGATOIRE
  valeurPerdue: number  // GNF
  validePar: string
  createdAt: Timestamp
}
```

### `users`
```javascript
{
  uid: string           // = UID Firebase Auth
  displayName: string
  email: string
  role: "gerant" | "caissier"
}
```

---

## 🔒 Règles de Sécurité

Les règles Firestore garantissent :
- ✅ Lecture/écriture uniquement pour utilisateurs authentifiés
- ✅ Ventes verrouillées modifiables seulement par gérant
- ✅ Avaries modifiables/supprimables seulement par gérant
- ✅ Profil utilisateur modifiable seulement par lui-même
- ❌ Suppression de ventes interdite

---

## 🛠️ Commandes Utiles

```bash
# Développement
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview

# Lint
npm run lint
```

---

## 📝 Notes Importantes

### Transactions Atomiques
Les opérations critiques utilisent des transactions Firestore :
- Déduction de stock lors d'une vente
- Mise à jour du PAMP lors d'un réapprovisionnement
- Modification des crédits clients

### Prix Achat Moyen Pondéré (PAMP)
Formule : `(Stock_actuel × PAMP_actuel + Qte_achat × Prix_achat) / (Stock_actuel + Qte_achat)`

### Statut des Ventes
- **payé** : Montant encaissé = Total
- **crédit** : Vente à crédit (montant encaissé = 0)
- **partiel** : Acompte versé (0 < montant < total)
- **retard** : Crédit en retard (géré manuellement)

### Alertes Stock
Badge ALERTE RUPTURE quand `stockCart ≤ seuilAlerte`

---

## 🐛 Résolution de Problèmes

### Erreur de connexion Firebase
- Vérifie que `.env.local` existe et contient les bonnes clés
- Vérifie que le projet Firebase est actif
- Vérifie les règles Firestore

### Erreur "Permission denied"
- Vérifie que l'utilisateur a un document dans `users/{uid}`
- Vérifie le rôle de l'utilisateur
- Vérifie les règles Firestore

### Index manquant
- Firestore affichera un lien dans la console
- Clique sur le lien pour créer l'index automatiquement

---

## 📄 Licence

© 2026 Poissonnerie Tata — Tous droits réservés

---

## 🤝 Support

Pour toute question, consulte le **[GUIDE_INTEGRATION_FIREBASE.md](./GUIDE_INTEGRATION_FIREBASE.md)**
