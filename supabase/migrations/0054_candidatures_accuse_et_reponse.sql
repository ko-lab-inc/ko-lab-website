-- =============================================================================
-- 0054 — candidatures : accusé de réception, et réponse au candidat
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — `add column if not exists`, CHECK conditionnel.
-- NON destructive.
--
-- -----------------------------------------------------------------------------
-- CE QUI MANQUAIT, CONSTATÉ LE 3 OCTOBRE 2026
-- -----------------------------------------------------------------------------
-- La migration 0049 a donné aux DEMANDES DE CONTACT un accusé de réception et
-- un courriel « demande traitée ». Les CANDIDATURES n'ont rien reçu de tout
-- ça : depuis 0049, l'équipe est prévenue d'une nouvelle candidature, mais le
-- candidat, lui, n'a jamais le moindre courriel.
--
-- Il joint son CV, l'écran lui promet une réponse « dans les 48 heures
-- ouvrables », et plus rien. Ni à l'envoi, ni quand son dossier est refusé.
--
--
-- =============================================================================
-- 1. LA LANGUE DU CANDIDAT  (1 colonne)
-- =============================================================================
--
-- ⚠️ POURQUOI ELLE DOIT ÊTRE STOCKÉE, ET PAS DÉDUITE AU MOMENT DE L'ENVOI
--
-- L'accusé part dans la seconde : on pourrait se contenter de la langue de la
-- page. Mais la RÉPONSE DE REFUS part des jours ou des semaines plus tard,
-- depuis /admin/candidatures — et à ce moment-là, la seule langue disponible
-- est celle de l'écran qu'un membre de l'équipe a ouvert.
--
-- C'est exactement le piège décrit dans gabaritStatutCommande.ts : un courriel
-- parti en anglais chez un client francophone parce que quelqu'un travaillait
-- sur /en/admin/. Pour un refus de candidature, l'erreur est pire — c'est le
-- seul message que cette personne recevra jamais de KO-LAB.
--
-- `default 'fr'` : les candidatures déjà en base viennent toutes du site
-- français (la version anglaise de /carrieres existe, mais aucune candidature
-- connue n'en provient). Un repli faux dans l'autre sens serait plus visible.

alter table public.candidatures
  add column if not exists locale text not null default 'fr';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'candidatures_locale_check'
      and conrelid = 'public.candidatures'::regclass
  ) then
    alter table public.candidatures
      add constraint candidatures_locale_check check (locale in ('fr', 'en'));
  end if;
end $$;


-- =============================================================================
-- 2. ACCUSÉ DE RÉCEPTION AU CANDIDAT  (2 colonnes)
-- =============================================================================
--
-- Mêmes colonnes et même raison que `demandes_contact` en 0049 : un envoi qui
-- échoue ne doit pas disparaître dans les journaux du serveur. Le candidat
-- voit « Candidature envoyée » quoi qu'il arrive ; si le courriel n'est pas
-- parti, le seul endroit où ça peut se savoir est la ligne elle-même.

alter table public.candidatures
  add column if not exists accuse_envoye boolean not null default false,
  add column if not exists accuse_erreur text;


-- =============================================================================
-- 3. RÉPONSE AU CANDIDAT  (2 colonnes)
-- =============================================================================
--
-- ⚠️ CE COURRIEL N'EST PAS DÉCLENCHÉ PAR LE CHANGEMENT DE STATUT.
--
-- Il aurait été plus simple de l'envoyer automatiquement au passage à
-- `refusee`, comme le courriel « demande traitée » part au passage à `traite`.
-- C'est délibérément refusé.
--
-- Les deux cas n'ont rien de comparable. « Votre demande a été traitée » ne
-- dit rien d'irréversible : envoyé par erreur, il est au pire inutile. « Votre
-- candidature n'a pas été retenue » met fin à la relation avec une personne
-- qui a confié son CV. Un clic de trop dans une liste déroulante de statuts
-- — un mauvais dossier, un classement de routine, un test — et le message est
-- parti, sans rattrapage possible.
--
-- L'envoi passe donc par un bouton distinct, avec confirmation, visible
-- seulement sur un dossier déjà marqué `refusee`.
--
-- POURQUOI UN HORODATAGE ET PAS UN BOOLÉEN
-- `reponse_envoyee_le` répond à « quand », ce qu'un booléen ne sait pas dire.
-- Quand un candidat rappelle, savoir si la réponse est partie avant ou après
-- son appel change ce qu'on lui répond. Il sert aussi de verrou : non NULL,
-- le bouton disparaît, et l'action serveur refuse un second envoi.
--
-- `reponse_par` : qui l'a envoyée. Même discipline que `statut_par` (0051) —
-- une action sortante, irréversible, doit porter un nom.

alter table public.candidatures
  add column if not exists reponse_envoyee_le timestamptz,
  add column if not exists reponse_par uuid references auth.users (id) on delete set null;


-- =============================================================================
-- VÉRIFICATION APRÈS EXÉCUTION
-- =============================================================================
-- 1) Les 5 colonnes existent (doit renvoyer 5 lignes) :
--    select column_name, data_type, column_default
--    from information_schema.columns
--    where table_schema = 'public' and table_name = 'candidatures'
--      and column_name in ('locale', 'accuse_envoye', 'accuse_erreur',
--                          'reponse_envoyee_le', 'reponse_par')
--    order by column_name;
--
-- 2) La contrainte de langue est posée (doit renvoyer une ligne) :
--    select conname from pg_constraint
--    where conrelid = 'public.candidatures'::regclass
--      and conname = 'candidatures_locale_check';
--
-- 3) Aucune candidature existante n'a été perdue, et toutes sont en 'fr' :
--    select locale, count(*) from public.candidatures group by locale;
--
-- 4) Aucune réponse n'est marquée comme déjà envoyée (doit renvoyer 0) :
--    select count(*) from public.candidatures where reponse_envoyee_le is not null;
