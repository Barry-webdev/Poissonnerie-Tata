# Document de Spécifications — ERP/POS Poissonnerie Tata

## Introduction

Ce document définit les exigences fonctionnelles et non-fonctionnelles du système ERP/POS Poissonnerie Tata, dérivées du document de design approuvé. Le système couvre huit modules : Dashboard, Catalogue/POS, Ventes, Caisse Journalière, Clients & Crédits, Stock Frigo, Avaries & Pertes, et Paramètres. Il repose sur React 19 + TypeScript + Tailwind CSS v4 + Firebase v10, avec une charte graphique Bleu Marine / Gris Ardoise / Jaune d'or.

---

## Glossaire

- **System** : L'application ERP/POS Poissonnerie Tata dans son ensemble
- **POS** : Point Of Sale — interface caisse tactile (vue Catalogue + panier)
- **Catalogue** : Vue de sélection des produits dans le POS
- **CartSection** : Composant panier latéral du POS
- **Dashboard** : Vue récapitulative des KPI de la journée
- **Produit** : Article du catalogue poissonnerie (ex. Chinchard, Maquereau…)
- **Vente** : Transaction commerciale enregistrée avec ses lignes, son mode de règlement et son statut
- **LigneVente** : Ligne unitaire d'une vente (produit, type unité, quantité, prix)
- **Client** : Acheteur enregistré pouvant bénéficier d'un crédit
- **Avarie** : Sortie de stock pour motif de perte ou de détérioration
- **CaisseJour** : Solde physique journalier (Espèces + Virement, hors Crédit)
- **PAMP** : Prix d'Achat Moyen Pondéré par carton
- **StockService** : Service `produitService.ts` gérant le stock
- **VenteService** : Service `venteService.ts` gérant les ventes
- **ClientService** : Service `clientService.ts` gérant les clients et crédits
- **AvarieService** : Service `avariesService.ts` gérant les avaries
- **DocumentService** : Module d'impression/génération de documents (reçus, factures, rapports)
- **RapportService** : Fonctions de génération des quatre rapports métier
- **Firestore** : Base de données Firebase utilisée comme backend
- **SuperAdmin** : Gérant habilité à déverrouiller une vente via double-authentification
- **ModeReglement** : `'Espèces' | 'Virement' | 'Crédit'`
- **StatutVente** : `'payé' | 'crédit' | 'partiel' | 'retard'`
- **StatutClient** : `'actif' | 'retard' | 'bloque'`
- **TypeUnite** : `'Carton' | 'Kg'`
- **FIREBASE_READY** : Flag booléen basculant entre mode mock local et Firestore réel

---

## Exigences

### Exigence 1 : Dashboard — Indicateurs Clés de Performance

**User Story :** En tant que gérant, je veux voir en un coup d'œil les KPI de la journée, afin de piloter l'activité commerciale en temps réel.

#### Critères d'Acceptation

1. WHEN le Dashboard est affiché, THE System SHALL calculer et afficher la valeur `caisseJour` égale à la somme des `montantEncaisse` de toutes les ventes du jour dont le `modeReglement` est différent de `'Crédit'`
2. WHEN le Dashboard est affiché, THE System SHALL calculer et afficher le nombre de ventes du jour et la marge estimée dérivée du PAMP des produits vendus
3. WHEN le Dashboard est affiché, THE System SHALL calculer et afficher le solde total de `creditEnCours` de tous les clients ayant un statut `'retard'` ou `'crédit'`
4. WHEN le Dashboard est affiché, THE System SHALL calculer et afficher le nombre de produits dont `stockCart` est inférieur ou égal à `seuilAlerte`
5. WHEN le Dashboard est affiché, THE System SHALL afficher le tableau des dernières ventes triées par date décroissante
6. WHEN un produit a un `stockCart` inférieur ou égal à son `seuilAlerte`, THE System SHALL afficher une alerte stock critique visible dans le Dashboard

---

### Exigence 2 : Catalogue Produits — Affichage et Navigation

**User Story :** En tant que caissier, je veux parcourir le catalogue produits de façon tactile, afin de sélectionner rapidement les articles à vendre.

#### Critères d'Acceptation

1. THE System SHALL afficher uniquement les produits dont le champ `actif` est égal à `true` dans la grille du Catalogue
2. WHEN un produit est affiché dans la grille, THE System SHALL présenter son emoji, son nom, sa catégorie, son stock en cartons, son stock en kg, son prix carton et son prix au kg
3. WHEN un produit a un `stockCart` inférieur ou égal à son `seuilAlerte`, THE System SHALL afficher le badge `⚠️ ALERTE RUPTURE` sur la carte produit correspondante
4. WHEN un caissier clique sur le bouton `+ Carton` d'un produit, THE System SHALL ajouter une ligne au panier avec `type = 'Carton'` et `prixUnit = produit.prixCart`
5. WHEN un caissier clique sur le bouton `+ Kg` d'un produit, THE System SHALL ajouter une ligne au panier avec `type = 'Kg'` et `prixUnit = produit.prixKg`

---

### Exigence 3 : POS — Panier et Calcul en Temps Réel

**User Story :** En tant que caissier, je veux gérer le panier d'achat avec les totaux calculés en temps réel, afin de valider rapidement une transaction.

#### Critères d'Acceptation

1. WHEN des articles sont présents dans le panier, THE CartSection SHALL calculer et afficher `totalNet` égal à la somme de `(item.qte * item.prixUnit)` pour chaque ligne du panier
2. WHEN un montant est saisi dans le champ encaissement, THE CartSection SHALL calculer et afficher `resteAPayer = max(0, totalNet - montantEncaisse)` en temps réel
3. WHEN le `modeReglement` est `'Crédit'` et que `resteAPayer` est supérieur à `0.8 * (client.plafondCredit - client.creditEnCours)`, THE CartSection SHALL afficher une alerte visuelle avec la couleur `#ECC94B`
4. WHEN le `modeReglement` est `'Crédit'` et que `resteAPayer` est supérieur à `(client.plafondCredit - client.creditEnCours)`, THE CartSection SHALL désactiver le bouton de validation de l'encaissement
5. WHEN la quantité d'un article dans le panier est modifiée, THE CartSection SHALL recalculer immédiatement `totalNet` et `resteAPayer`
6. WHEN un article est supprimé du panier, THE CartSection SHALL recalculer immédiatement `totalNet` et `resteAPayer`

---

### Exigence 4 : POS — Validation de l'Encaissement

**User Story :** En tant que caissier, je veux valider une vente avec déduction atomique du stock, afin de garantir la cohérence des données.

#### Critères d'Acceptation

1. WHEN le caissier valide l'encaissement, THE VenteService SHALL enregistrer la vente avec `locked = true` immédiatement après création
2. WHEN le caissier valide l'encaissement, THE StockService SHALL déduire atomiquement les quantités vendues du stock de chaque produit via `runTransaction`
3. IF le stock disponible d'un produit est insuffisant pour satisfaire la ligne de vente, THEN THE StockService SHALL annuler la transaction entière et retourner une erreur descriptive
4. WHEN la vente est validée avec `modeReglement = 'Crédit'` et `resteAPayer > 0`, THE ClientService SHALL incrémenter `client.creditEnCours` du montant `resteAPayer`
5. WHEN la vente est validée avec succès, THE System SHALL vider le panier et réinitialiser le champ encaissement
6. WHEN la vente est validée avec succès, THE System SHALL déterminer le `statut` de la vente : `'payé'` si `resteAPayer = 0`, `'crédit'` si `modeReglement = 'Crédit'` et `resteAPayer > 0`, `'partiel'` sinon

---

### Exigence 5 : Ventes — Historique et Filtrage

**User Story :** En tant que gérant, je veux consulter et filtrer l'historique des ventes, afin de suivre l'activité commerciale par statut et par période.

#### Critères d'Acceptation

1. THE System SHALL afficher toutes les ventes enregistrées dans la vue Ventes, triées par date décroissante
2. WHEN un filtre de statut est appliqué, THE System SHALL afficher uniquement les ventes dont le `statut` correspond au filtre sélectionné
3. WHEN un filtre est actif, THE System SHALL calculer et afficher en temps réel le total filtré égal à la somme des `totalNet` des ventes affichées
4. THE System SHALL afficher pour chaque vente : la date, le nom du client, le total net, le mode de règlement, le montant encaissé, le reste à payer et le statut

---

### Exigence 6 : Ventes — Verrouillage et Rectification

**User Story :** En tant que gérant, je veux pouvoir rectifier une vente incorrecte avec double-authentification, afin de maintenir l'intégrité des données tout en permettant les corrections nécessaires.

#### Critères d'Acceptation

1. THE VenteService SHALL stocker toute vente nouvellement créée avec le champ `locked = true`
2. WHEN un utilisateur tente de modifier une vente avec `locked = true`, THE System SHALL refuser la modification sans authentification Super-Admin
3. WHEN le SuperAdmin soumet un PIN valide via `deverrouillerVente`, THE VenteService SHALL passer `locked` à `false` pour permettre la rectification
4. IF le PIN soumis est invalide, THEN THE VenteService SHALL retourner `false` et conserver `locked = true`
5. WHEN une rectification est appliquée via `rectifierVente`, THE VenteService SHALL exécuter la mise à jour du stock et de la vente dans une `runTransaction` atomique
6. WHEN la rectification est enregistrée, THE VenteService SHALL repasser `locked` à `true` et enregistrer `modifiePar` et `modifieAt`

---

### Exigence 7 : Caisse Journalière

**User Story :** En tant que gérant, je veux consulter la situation de caisse du jour, afin de réconcilier les encaissements physiques.

#### Critères d'Acceptation

1. WHEN la vue Caisse est affichée, THE System SHALL calculer `caisseJour` comme la somme des `montantEncaisse` de toutes les ventes du jour où `modeReglement` est `'Espèces'` ou `'Virement'`
2. THE System SHALL afficher le détail des encaissements groupé par `modeReglement` (Espèces, Virement, Crédit)
3. THE System SHALL afficher la liste des transactions du jour avec : heure, client, total, mode de règlement et montant encaissé
4. THE System SHALL exclure les ventes avec `modeReglement = 'Crédit'` du calcul du solde de caisse physique

---

### Exigence 8 : Clients & Crédits

**User Story :** En tant que gérant, je veux gérer les encours de crédit des clients, afin de maîtriser le risque client et suivre les remboursements.

#### Critères d'Acceptation

1. WHEN la fiche client est affichée, THE System SHALL afficher une barre de progression indiquant le ratio `creditEnCours / plafondCredit`
2. WHEN le gérant saisit un montant d'apurement, THE ClientService SHALL réduire `creditEnCours` de ce montant, avec un minimum à `0`
3. WHEN `creditEnCours` devient `0` après apurement, THE ClientService SHALL passer le `statut` du client à `'actif'`
4. WHEN `creditEnCours` dépasse `0.8 * plafondCredit`, THE ClientService SHALL passer le `statut` du client à `'retard'`
5. WHEN `creditEnCours` atteint ou dépasse `plafondCredit`, THE ClientService SHALL passer le `statut` du client à `'bloque'`
6. IF `client.creditEnCours + montantNouvelAchat > client.plafondCredit`, THEN THE ClientService SHALL lever une erreur `'PLAFOND_DEPASSE'` et annuler l'opération
7. THE System SHALL afficher l'historique des achats et paiements pour chaque client

---

### Exigence 9 : Stock Frigo — Gestion Double Unité

**User Story :** En tant que gérant, je veux gérer le stock en double unité (Carton et Kg), afin de suivre précisément les niveaux de stock et leur valorisation.

#### Critères d'Acceptation

1. THE StockService SHALL maintenir pour chaque produit deux niveaux de stock distincts : `stockCart` (nombre de cartons) et `stockKg` (poids total en kg)
2. WHEN un réapprovisionnement est enregistré, THE StockService SHALL recalculer `pampCart` selon la formule : `PAMP_nouveau = (stockCart * pampCart_ancien + qteAchat * prixAchatCart) / (stockCart + qteAchat)`
3. WHEN un réapprovisionnement est enregistré, THE StockService SHALL mettre à jour simultanément `stockCart`, `stockKg` et `pampCart`
4. THE StockService SHALL garantir que `stockCart >= 0` et `stockKg >= 0` à tout moment
5. WHEN `stockCart` est inférieur ou égal à `seuilAlerte`, THE System SHALL déclencher une alerte réapprovisionnement visible dans la vue Stock Frigo
6. THE System SHALL afficher la valorisation totale du stock calculée comme `sum(produit.stockCart * produit.pampCart)` pour chaque produit

---

### Exigence 10 : Avaries & Pertes

**User Story :** En tant que gérant, je veux enregistrer les avaries et pertes de marchandise avec un motif obligatoire, afin de tracer les sorties de stock non commerciales.

#### Critères d'Acceptation

1. WHEN un formulaire d'avarie est soumis, THE AvarieService SHALL rejeter la soumission si le champ `motif` est vide ou composé uniquement d'espaces
2. WHEN une avarie valide est enregistrée, THE AvarieService SHALL déduire atomiquement `qteCart` de `produit.stockCart` et `poidsKg` de `produit.stockKg` via `runTransaction`
3. IF le stock disponible est insuffisant pour absorber l'avarie déclarée, THEN THE AvarieService SHALL annuler la transaction et retourner une erreur
4. WHEN une avarie est enregistrée, THE AvarieService SHALL calculer `valeurPerdue = (qteCart * produit.pampCart) + (poidsKg * produit.prixKg)`
5. WHEN une avarie est enregistrée, THE AvarieService SHALL stocker `validePar` avec l'identifiant de l'utilisateur courant
6. THE System SHALL afficher l'historique des avaries filtrable par produit et par date

---

### Exigence 11 : Paramètres — Gestion des Profils et Configuration

**User Story :** En tant que gérant, je veux gérer les profils utilisateurs et les plafonds de crédit, afin de contrôler les accès et les limites financières.

#### Critères d'Acceptation

1. THE System SHALL distinguer deux rôles : `'gerant'` ayant accès complet et `'caissier'` ayant accès restreint aux opérations de vente
2. WHERE le rôle est `'gerant'`, THE System SHALL autoriser la modification des `plafondCredit` de tous les clients
3. WHERE le rôle est `'caissier'`, THE System SHALL interdire la modification des `plafondCredit` et la rectification de ventes verrouillées
4. WHEN un gérant modifie le plafond crédit d'un client, THE ClientService SHALL mettre à jour `plafondCredit` et réévaluer le `statut` du client si nécessaire

---

### Exigence 12 : Documents Générables — Reçu et Facture

**User Story :** En tant que caissier, je veux générer des reçus thermiques et des factures PDF, afin de fournir des justificatifs aux clients.

#### Critères d'Acceptation

1. WHEN un reçu thermique est demandé pour une vente, THE DocumentService SHALL générer un document formaté pour impression 80mm contenant : date, lignes de vente, total net, montant encaissé et reste à payer
2. WHEN une facture A4 est demandée pour une vente à crédit, THE DocumentService SHALL générer un PDF contenant une zone visuellement distincte affichant le montant `resteAPayer`
3. THE DocumentService SHALL inclure dans la facture A4 : les coordonnées du client, les lignes de vente détaillées, le total net, le montant encaissé et le reste à payer
4. WHEN le reçu thermique est généré, THE DocumentService SHALL déclencher `window.print()` avec une feuille de style `@media print` ciblant la largeur 80mm

---

### Exigence 13 : Rapports Métier

**User Story :** En tant que gérant, je veux générer quatre rapports métier, afin d'analyser l'activité commerciale et financière de la poissonnerie.

#### Critères d'Acceptation

1. WHEN le rapport de caisse journalier est généré pour une date donnée, THE RapportService SHALL produire un récapitulatif des encaissements groupés par `modeReglement` pour cette date
2. WHEN le rapport analytique ventes est généré, THE RapportService SHALL calculer le chiffre d'affaires total, la marge estimée et les top produits vendus
3. WHEN le rapport balance âgée crédits est généré, THE RapportService SHALL lister tous les clients avec `statut = 'retard'` ou `statut = 'bloque'`, leurs montants de crédit en cours et les durées d'encours
4. WHEN le rapport inventaire frigo est généré, THE RapportService SHALL produire la liste de tous les produits avec leur `stockCart`, `stockKg` et valorisation `stockCart * pampCart`
5. WHEN le rapport de caisse journalier est généré, THE RapportService SHALL exclure les ventes avec `modeReglement = 'Crédit'` du total caisse physique

---

### Exigence 14 : Sécurité et Atomicité

**User Story :** En tant que système, je veux garantir l'intégrité des données et la sécurité des accès, afin de prévenir toute incohérence ou manipulation non autorisée.

#### Critères d'Acceptation

1. WHEN une opération de déduction de stock est lancée, THE StockService SHALL exécuter toutes les lectures avant toutes les écritures dans la `runTransaction` Firestore
2. IF une étape de la `runTransaction` échoue, THEN THE StockService SHALL annuler l'ensemble de la transaction sans aucune modification partielle
3. THE System SHALL interdire la suppression de tout document de la collection `ventes` dans les règles Firestore
4. WHEN un utilisateur non authentifié tente d'accéder à l'application, THE System SHALL rediriger vers la page de connexion
5. WHERE l'authentification Firebase est active (`FIREBASE_READY = true`), THE System SHALL appliquer les règles Firestore de contrôle d'accès par rôle
6. THE System SHALL fonctionner en mode mock local (`FIREBASE_READY = false`) sans connexion Firebase, avec des données en mémoire

---

### Exigence 15 : Charte Graphique et Interface

**User Story :** En tant qu'utilisateur, je veux une interface visuellement cohérente, afin de naviguer efficacement dans l'application.

#### Critères d'Acceptation

1. THE System SHALL appliquer la couleur `#1A365D` (Bleu Marine) à la topbar, la sidebar et les titres de sections sécuritaires
2. THE System SHALL appliquer la couleur `#4A5568` (Gris Ardoise) aux fonds de tableaux et textes secondaires
3. THE System SHALL appliquer la couleur `#ECC94B` (Jaune d'or) aux boutons de validation, aux zones "Reste à payer" et aux alertes crédit
4. WHEN l'élément de navigation actif est sélectionné dans la Sidebar, THE System SHALL appliquer un fond `#ECC94B` et un texte `#1A365D` à cet élément
5. THE System SHALL afficher une cloche de notification dans la Topbar avec un badge indiquant le nombre d'alertes actives
