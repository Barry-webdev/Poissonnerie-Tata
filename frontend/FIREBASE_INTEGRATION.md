# Guide d'intégration Firebase — Poissonnerie Tata ERP

## 1. Installation

```bash
npm install
```

Firebase est déjà déclaré dans `package.json`. Cette commande suffit.

---

## 2. Configuration

Copie `.env.example` → `.env.local` et remplis les 6 valeurs depuis
la console Firebase (Paramètres du projet → Tes applications → SDK Config) :

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=poissonnerie-tata.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=poissonnerie-tata
VITE_FIREBASE_STORAGE_BUCKET=poissonnerie-tata.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_SUPER_ADMIN_PIN=ton_pin_secret
```

Le fichier `src/firebase/config.ts` lit ces variables automatiquement.
**Ne jamais committer `.env.local`** (déjà dans `.gitignore`).

---

## 3. Collections Firestore à créer

### `produits/{auto-id}`
```
nom:          string       "Chinchard Mauri 20"
categorie:    string       "Pélagique" | "Démersal" | "Fumé"
stockCart:    number       45
stockKg:      number       900
kgParCarton:  number       20
prixCart:     number       450000   (GNF)
prixKg:       number       22500    (GNF)
pampCart:     number       380000   (Prix Achat Moyen Pondéré)
seuilAlerte:  number       5        (déclenche le badge RUPTURE)
emoji:        string       "🐟"
actif:        boolean      true
updatedAt:    Timestamp    serverTimestamp()
```

### `ventes/{auto-id}`
```
date:            Timestamp   serverTimestamp()
dateStr:         string      "2026-06-03"
clientId:        string|null  référence vers clients/{id}
clientNom:       string       "Amadou Diallo"
lignes:          Array<{
  produitId:     string
  produitNom:    string
  type:          "Carton" | "Kg"
  qte:           number
  prixUnit:      number
  total:         number
}>
totalNet:        number
modeReglement:   "Espèces" | "Virement" | "Crédit"
montantEncaisse: number
resteAPayer:     number
caissier:        string
statut:          "payé" | "crédit" | "partiel" | "retard"
locked:          boolean     true (immuable après création)
modifiePar:      string|null
modifieAt:       Timestamp|null
```

### `clients/{auto-id}`
```
nom:           string    "Amadou Diallo"
telephone:     string    "621 000 001"
creditEnCours: number    500000   (GNF)
plafondCredit: number    2000000  (GNF)
statut:        string    "actif" | "retard" | "bloque"
historique:    Array<{
  venteId:     string
  date:        Timestamp
  montant:     number
  type:        "achat" | "paiement"
}>
createdAt:     Timestamp
updatedAt:     Timestamp
```

### `avaries/{auto-id}`
```
date:         Timestamp
dateStr:      string    "2026-06-03"
produitId:    string    référence vers produits/{id}
produitNom:   string
qteCart:      number
poidsKg:      number
motif:        string    OBLIGATOIRE — non vide
valeurPerdue: number    GNF
validePar:    string    displayName du caissier
createdAt:    Timestamp
```

### `users/{uid}`  ← créé automatiquement à la connexion
```
uid:         string    (= l'UID Firebase Auth)
displayName: string    "Admin Tata"
email:       string
role:        string    "gerant" | "caissier"
```

---

## 4. Règles Firestore à copier

Dans la console Firebase → Firestore → Règles :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }
    function isGerant() {
      return isAuth() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'gerant';
    }

    match /produits/{id} {
      allow read:  if isAuth();
      allow write: if isAuth();
    }
    match /ventes/{id} {
      allow read:   if isAuth();
      allow create: if isAuth();
      allow update: if isAuth() && (!resource.data.locked || isGerant());
      allow delete: if false;
    }
    match /clients/{id} {
      allow read, write: if isAuth();
    }
    match /avaries/{id} {
      allow read:          if isAuth();
      allow create:        if isAuth();
      allow update, delete: if isGerant();
    }
    match /users/{uid} {
      allow read:  if isAuth();
      allow write: if isAuth() && request.auth.uid == uid;
    }
  }
}
```

---

## 5. Index Firestore à créer

Dans la console Firebase → Firestore → Index → Composite :

| Collection | Champ 1   | Champ 2     | Ordre |
|------------|-----------|-------------|-------|
| ventes     | dateStr   | statut      | ASC   |
| ventes     | clientId  | date        | DESC  |
| ventes     | dateStr   | modeReglement | ASC |
| avaries    | produitId | date        | DESC  |

---

## 6. Authentification Firebase à activer

Dans la console Firebase → Authentication → Sign-in method :
- Activer **Email/Mot de passe**
- Créer les comptes utilisateurs manuellement ou via l'app

Après chaque inscription, créer le document `users/{uid}` avec le rôle :
```js
// Exemple via la console Firebase ou un script admin
{
  displayName: "Admin Tata",
  email: "admin@poissonnerie-tata.com",
  role: "gerant"
}
```

---

## 7. Architecture des services (ne pas modifier)

```
src/
├── firebase/config.ts       ← initialisation Firebase
├── services/
│   ├── produitService.ts    ← getProduits, ajouterProduit, deduireStock (runTransaction)
│   ├── venteService.ts      ← getVentes, ajouterVente (locked=true), deverrouillerVente
│   ├── clientService.ts     ← getClients, apurerCredit, incrementerCredit
│   └── avariesService.ts    ← getAvaries, ajouterAvarie (motif obligatoire)
├── hooks/useAuth.ts         ← onAuthStateChanged + profil depuis /users/{uid}
└── types/pos.ts             ← types TypeScript pour toutes les collections
```

Tous les services appellent directement Firestore.
Les types TypeScript dans `pos.ts` correspondent exactement aux schémas ci-dessus.
