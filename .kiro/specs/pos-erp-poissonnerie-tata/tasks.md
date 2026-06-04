# Tasks — ERP/POS Poissonnerie Tata

## Task List

- [ ] 1. Configuration TypeScript et fichiers racine
  - [ ] 1.1 Créer `frontend/tsconfig.json` et `frontend/tsconfig.node.json`
  - [ ] 1.2 Créer `frontend/vite.config.ts` (renommer depuis .js)
  - [ ] 1.3 Mettre à jour `frontend/index.html` (titre + pointer vers main.tsx)
  - [ ] 1.4 Mettre à jour `frontend/.env.example`

- [ ] 2. Types TypeScript
  - [ ] 2.1 Créer `frontend/src/types/pos.ts` avec tous les types exhaustifs

- [ ] 3. Firebase config (mock ready)
  - [ ] 3.1 Créer `frontend/src/firebase/config.ts`

- [ ] 4. Services (mock + double chemin Firebase)
  - [ ] 4.1 Créer `frontend/src/services/produitService.ts`
  - [ ] 4.2 Créer `frontend/src/services/venteService.ts`
  - [ ] 4.3 Créer `frontend/src/services/clientService.ts`
  - [ ] 4.4 Créer `frontend/src/services/avariesService.ts`

- [ ] 5. Hooks
  - [ ] 5.1 Créer `frontend/src/hooks/useAuth.ts`

- [ ] 6. Composants partagés
  - [ ] 6.1 Créer `frontend/src/components/Badge.tsx`
  - [ ] 6.2 Créer `frontend/src/components/Sidebar.tsx`
  - [ ] 6.3 Créer `frontend/src/components/Topbar.tsx`
  - [ ] 6.4 Créer `frontend/src/components/ProductCard.tsx`
  - [ ] 6.5 Créer `frontend/src/components/CartSection.tsx`
  - [ ] 6.6 Créer `frontend/src/components/StatsFooter.tsx`

- [ ] 7. Vues (8 pages)
  - [ ] 7.1 Créer `frontend/src/views/Dashboard.tsx`
  - [ ] 7.2 Créer `frontend/src/views/Catalogue.tsx`
  - [ ] 7.3 Créer `frontend/src/views/Ventes.tsx`
  - [ ] 7.4 Créer `frontend/src/views/Caisse.tsx`
  - [ ] 7.5 Créer `frontend/src/views/Clients.tsx`
  - [ ] 7.6 Créer `frontend/src/views/StockFrigo.tsx`
  - [ ] 7.7 Créer `frontend/src/views/Avaries.tsx`
  - [ ] 7.8 Créer `frontend/src/views/Parametres.tsx`

- [ ] 8. Composant racine App.tsx
  - [ ] 8.1 Créer `frontend/src/App.tsx` avec routing par état et handleValidateSale

- [ ] 9. Point d'entrée main.tsx et styles
  - [ ] 9.1 Créer `frontend/src/main.tsx`
  - [ ] 9.2 Mettre à jour `frontend/src/index.css`

- [ ] 10. Nettoyage
  - [ ] 10.1 Supprimer `frontend/src/App.jsx` et `frontend/src/main.jsx`
  - [ ] 10.2 Supprimer `frontend/vite.config.js` et `frontend/src/firebase/config.js`

- [ ] 11. Vérification build TypeScript
  - [ ] 11.1 Lancer `vite build` pour vérifier aucune erreur de compilation
