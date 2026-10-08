-- =============================================================================
-- 0056 — Dépôt des demandes de location dans Rentman
-- =============================================================================
-- Une demande de location part désormais toute seule dans Rentman, sous forme
-- de DEMANDE DE PROJET (`/projectrequests`) que Roxanne accepte ou refuse.
-- Rien n'entre dans sa production sans ce geste : une demande de projet n'est
-- pas un projet.
--
-- Ces colonnes gardent la trace du dépôt. Sans elles, un échec serait muet :
-- la demande arriverait chez nous, ne partirait jamais chez eux, et personne
-- ne l'apprendrait. Même raison que `notification_envoyee` (0049).
--
-- -----------------------------------------------------------------------------
-- LE NUMÉRO
-- -----------------------------------------------------------------------------
-- Rentman affiche `external_reference` dans sa colonne « Numéro », et
-- N'EN ATTRIBUE AUCUN tout seul : vérifié le 7 octobre 2026, une demande
-- déposée sans ce champ s'affiche avec le numéro 0. Toutes les demandes du
-- site se ressembleraient donc dans sa liste.
--
-- D'où `numero`, alimenté par une séquence. Il sert des deux côtés : c'est le
-- numéro que Roxanne voit dans Rentman, et celui qu'on affiche dans
-- /admin/demandes. Une seule référence pour parler de la même demande au
-- téléphone.
--
-- ⚠️ `external_reference` n'accepte qu'un ENTIER côté Rentman (un envoi en
-- texte est refusé en 400) : impossible d'y mettre l'UUID de la demande.
-- C'est précisément pourquoi ce compteur existe.
-- =============================================================================

create sequence if not exists public.demandes_numero_seq start 1001;

-- USAGE explicite : `anon` détient un GRANT INSERT sur la table depuis 0004.
-- Sans ce droit sur la séquence, ce chemin d'insertion échouerait au moment du
-- `nextval`. L'API passe par la clé de service, mais on ne laisse pas une
-- porte déjà ouverte se refermer sur une erreur.
grant usage, select on sequence public.demandes_numero_seq to anon, authenticated;

alter table public.demandes_contact
  add column if not exists numero integer not null default nextval('public.demandes_numero_seq');

-- Identifiant de la demande de projet créée chez Rentman. NULL = jamais
-- déposée (demande de contact ordinaire, ou dépôt en échec).
alter table public.demandes_contact
  add column if not exists rentman_demande_id integer;

alter table public.demandes_contact
  add column if not exists rentman_envoye_le timestamptz;

-- Raison de l'échec, courte. NULL = aucun échec. Affichée dans
-- /admin/demandes pour que le bouton « Envoyer vers Rentman » ait du sens.
alter table public.demandes_contact
  add column if not exists rentman_erreur text;

comment on column public.demandes_contact.numero is
  'Numéro lisible, partagé avec Rentman (external_reference). Voir 0056.';
comment on column public.demandes_contact.rentman_demande_id is
  'id de la demande de projet Rentman. NULL = non déposée.';
comment on column public.demandes_contact.rentman_erreur is
  'Dernier échec de dépôt. NULL = aucun.';

-- Aucune policy ni GRANT de table à ajouter : 0002 et 0004 couvrent déjà ces
-- colonnes, les GRANT y étant accordés au niveau TABLE.
