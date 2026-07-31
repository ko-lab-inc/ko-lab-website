-- =============================================================================
-- 0018 — Retrait du contenu de démonstration (remplace 0008)
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA. Remplace 0008, QUI NE DOIT PLUS ÊTRE REJOUÉ.
--
-- -----------------------------------------------------------------------------
-- POURQUOI CE FICHIER EXISTE
-- -----------------------------------------------------------------------------
-- 0008 devait retirer le contenu inventé laissé par 0003_seed_dev.sql. Il a
-- échoué : sa première version ciblait `postes_carrieres.slug`, colonne qui
-- n'existe pas. L'éditeur SQL de Supabase exécutant le script dans une
-- transaction, l'erreur a TOUT annulé — y compris la mise à jour des
-- réalisations, pourtant correcte. Le fichier notait « à rejouer en entier ».
-- Il ne l'a jamais été.
--
-- Constaté le 2026-07-30 pendant l'audit de sécurité, en interrogeant la base
-- avec la clé anon — c'est-à-dire en voyant exactement ce que voit un
-- visiteur :
--
--   realisations?select=slug,publie  →  3 lignes, publie = true
--     - deploiement-evenementiel-2025
--     - installation-saisonniere-2025
--     - fabrication-sur-mesure-2025
--
-- Ces trois réalisations n'ont AUCUNE image, et la galerie /realisations
-- écarte les réalisations sans visuel : elles n'apparaissent donc pas sur le
-- site. Mais « invisible sur le site » n'est pas « retiré ». Elles restent
-- lisibles par n'importe qui via l'API REST publique, et un nom de projet
-- inventé attribué à KO-LAB reste une affirmation fausse sur le travail du
-- client, quel que soit le canal par lequel on la lit.
--
-- -----------------------------------------------------------------------------
-- ⚠️ POURQUOI IL NE FAUT SURTOUT PLUS REJOUER 0008
-- -----------------------------------------------------------------------------
-- 0008 se terminait par :
--
--     update public.postes_carrieres set actif = false
--     where titre_fr = 'Chef d''équipe terrain';
--
-- À l'époque, « Chef d'équipe terrain » désignait la fausse offre du seed de
-- développement. Depuis, la migration 0017 a inséré les NEUF postes réels de
-- Christian — et l'un d'eux s'intitule exactement « Chef d'équipe terrain ».
--
-- Rejouer 0008 aujourd'hui fermerait donc un poste réellement ouvert, sans
-- erreur ni message : l'offre disparaîtrait simplement de /carrieres et de la
-- liste du formulaire de candidature. Un ciblage par titre ne survit pas au
-- fait que le titre soit réattribué.
--
-- 0008 a donc été neutralisé sur place. Ce fichier-ci ne touche PAS à
-- postes_carrieres : la fausse offre du seed n'a jamais existé en base (0003
-- ne l'a pas insérée, son `where not exists` l'en a empêchée), et les neuf
-- offres présentes sont toutes réelles.
--
-- -----------------------------------------------------------------------------
-- DÉPUBLIER, PAS SUPPRIMER
-- -----------------------------------------------------------------------------
-- `publie = false` retire les lignes de toute lecture publique : la politique
-- RLS de lecture anonyme filtre sur `publie = true`. Si l'une de ces
-- réalisations devait finalement correspondre à un vrai chantier, il suffit de
-- la republier depuis /admin/realisations. Un DELETE, lui, ne se rattrape pas.
-- =============================================================================

update public.realisations
set publie = false
where slug in (
  'deploiement-evenementiel-2025',
  'installation-saisonniere-2025',
  'fabrication-sur-mesure-2025'
);

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
-- Après exécution, ceci doit renvoyer 0 ligne :
--
--   select slug, titre_fr, publie from public.realisations
--   where slug in (
--     'deploiement-evenementiel-2025',
--     'installation-saisonniere-2025',
--     'fabrication-sur-mesure-2025'
--   ) and publie = true;
--
-- Et les neuf offres doivent TOUTES rester actives — c'est le contrôle qui
-- vérifie qu'on n'a pas reproduit l'erreur de 0008 :
--
--   select count(*) from public.postes_carrieres where actif = true;  -- 9
--
-- Le script `npm run audit:supabase` refait ces deux contrôles tout seul.
-- =============================================================================
