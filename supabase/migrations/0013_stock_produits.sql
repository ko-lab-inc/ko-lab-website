-- =============================================================================
-- 0013 — Quantité en stock et statut de suivi pour le catalogue
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- Décision de Christian : « on dois aussi choisir entrer la quantité pour
-- pouvoir gérer le stock ; on dois egalement avoir la suivi de produit car
-- cela peut etre en cour de livraison ». Deux besoins distincts, deux
-- colonnes distinctes — la quantité est un nombre que l'équipe met à jour au
-- fil des ventes et réceptions ; le statut est une étiquette qu'elle choisit
-- (rien ne le calcule à partir de la quantité, une rupture ANNONCÉE avant
-- qu'elle n'arrive à zéro a sa place elle aussi).

alter table public.produits_boutique
  add column if not exists quantite integer not null default 0,
  add column if not exists statut_stock text not null default 'en_stock';

-- Contrainte séparée (plutôt que `check` inline) : `add constraint` échoue
-- proprement si elle existe déjà sous un autre nom, `create or replace`
-- n'existe pas pour les contraintes — `drop if exists` avant est la façon
-- idiomatique de rendre ce script rejouable.
alter table public.produits_boutique drop constraint if exists produits_statut_stock_check;
alter table public.produits_boutique add constraint produits_statut_stock_check
  check (statut_stock in ('en_stock', 'rupture', 'en_commande', 'en_livraison'));

comment on column public.produits_boutique.quantite is
  'Quantité en stock. Mise à jour manuelle depuis /admin/catalogue — aucune commande ne la décrémente automatiquement, le site fonctionne sur demande de prix, pas sur achat direct.';
comment on column public.produits_boutique.statut_stock is
  'en_stock | rupture | en_commande (chez le fournisseur) | en_livraison (en transit vers KO-LAB). Choisi par l''équipe, indépendant de `quantite` : une rupture annoncée par le fournisseur avant d''atteindre zéro a sa place ici.';

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select nom_fr, quantite, statut_stock from public.produits_boutique order by ordre;
--
-- Attendu : douze lignes, quantite = 0 et statut_stock = 'en_stock' pour
-- toutes — CE SONT DES VALEURS DE DÉPART, PAS LES VRAIES QUANTITÉS. Cette
-- migration ne les invente pas ; Christian les corrige depuis l'écran une
-- fois passée.
