-- =============================================================================
-- 0055 — Demandes de location structurées
-- =============================================================================
-- La demande groupée de /location/demande envoyait sa liste d'équipements et
-- ses dates en TEXTE LIBRE, noyées dans `message` :
--
--     Période de location : du 20 décembre 2026 au 27 décembre 2026
--
--     Équipements demandés en location :
--     - Petite fleur blanche, (Décor) x 2
--
-- Lisible par un humain, inexploitable par une machine. Conséquence concrète :
-- l'équipe retape chaque article à la main dans Rentman, en le cherchant par
-- son nom dans un inventaire de 590 pièces.
--
-- -----------------------------------------------------------------------------
-- POURQUOI DU JSONB ET PAS UNE TABLE `demandes_articles`
-- -----------------------------------------------------------------------------
-- Une table séparée serait plus orthodoxe, mais elle ajouterait une surface de
-- sécurité à tenir : ses propres policies RLS, ses propres GRANT, et le risque
-- qu'elles divergent de celles de `demandes_contact`. Or ces lignes ne sont
-- JAMAIS lues seules — toujours avec leur demande, par la même personne, sous
-- les mêmes droits. En colonne, elles héritent des policies de 0002 et des
-- GRANT de 0004 (accordés au niveau TABLE, donc les nouvelles colonnes sont
-- couvertes sans rien ajouter).
--
-- -----------------------------------------------------------------------------
-- CE QUE `lignes` CONTIENT, ET CE QU'IL NE CONTIENT PAS
-- -----------------------------------------------------------------------------
-- Un tableau d'objets, écrits par /api/contact :
--
--     [{ "rentman_id": 2689, "slug": "barrel-cocktail-table-2689",
--        "nom_fr": "Barrel Cocktail Table", "nom_en": null,
--        "categorie": "mobilier", "quantite": 2 }]
--
-- ⚠️ Le navigateur n'envoie QUE `slug` et `quantite`. Le `rentman_id`, les noms
-- et la catégorie sont RE-DÉRIVÉS côté serveur depuis `articles_location`,
-- jamais pris tels quels du client — même discipline que `schemaLigneCommande`
-- (lib/validation.ts) pour les commandes de la boutique. Un visiteur ne peut
-- donc ni inventer un article, ni renommer le vôtre, ni pointer un article
-- dépublié.
--
-- `message` reste rempli comme avant : c'est lui qui part dans le courriel à
-- l'équipe, et il reste lisible si ces colonnes sont vides (demande venue du
-- formulaire de contact classique, ou demande antérieure à cette migration).
-- =============================================================================

alter table public.demandes_contact
  add column if not exists date_debut date,
  add column if not exists date_fin   date,
  add column if not exists lignes     jsonb;

comment on column public.demandes_contact.date_debut is
  'Début de location souhaité (demande /location/demande). NULL ailleurs.';
comment on column public.demandes_contact.date_fin is
  'Retour souhaité. NULL ailleurs.';
comment on column public.demandes_contact.lignes is
  'Articles demandés, re-dérivés côté serveur depuis articles_location. Voir 0055.';

-- Les deux dates sont facultatives, mais si elles sont là elles doivent avoir
-- du sens. Le formulaire valide déjà côté client ; la base le garantit.
alter table public.demandes_contact
  drop constraint if exists demandes_dates_coherentes;
alter table public.demandes_contact
  add constraint demandes_dates_coherentes
  check (date_debut is null or date_fin is null or date_fin >= date_debut);

-- `lignes` est un TABLEAU ou rien. Sans cette contrainte, un objet ou une
-- chaîne JSON passerait, et l'écran d'administration planterait au `.map()`.
alter table public.demandes_contact
  drop constraint if exists demandes_lignes_tableau;
alter table public.demandes_contact
  add constraint demandes_lignes_tableau
  check (lignes is null or jsonb_typeof(lignes) = 'array');

-- Aucune policy ni GRANT à ajouter : 0002 (policies) et 0004 (GRANT au niveau
-- table) couvrent déjà ces colonnes. Vérifié avant d'écrire cette migration.
