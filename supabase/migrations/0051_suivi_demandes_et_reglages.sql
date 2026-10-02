-- =============================================================================
-- 0051 — suivi des demandes et des candidatures, nouveaux réglages
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — `add column if not exists`, `on conflict do
-- nothing` sur les réglages (une valeur déjà modifiée dans l'admin ne doit
-- JAMAIS être réécrite par un rejeu).
--
-- NON destructive : aucune donnée existante n'est touchée.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE — DIAGNOSTIC DU 2 OCTOBRE 2026
-- -----------------------------------------------------------------------------
-- Demande de Christian : « on doit ajouter plus de réglages dans l'admin, fais
-- un diagnostic et dis-moi ce qu'on doit mettre en place pour la gestion du
-- site et des contenus des demandes. »
--
-- Constat : une demande n'accepte aujourd'hui QU'UNE SEULE action — changer son
-- statut entre nouveau, lu et traité. Rien d'autre ne peut y être attaché.
-- L'écran est une boîte de réception, pas un outil de travail.
--
--   · Personne ne peut écrire ce qui s'est passé. Qui a appelé, ce qui a été
--     dit, le prix annoncé : tout ça vit dans la tête de quelqu'un, dans ses
--     courriels ou son téléphone, et disparaît quand cette personne est
--     absente.
--   · Le statut passe à « traité » sans dire PAR QUI ni QUAND. En cas de
--     doute une semaine plus tard, personne ne peut répondre.
--
-- Les candidatures ont exactement le même manque, avec des statuts plus riches
-- (retenue, refusée) mais toujours aucune note.
--
-- -----------------------------------------------------------------------------
-- POURQUOI `traite_par` RÉFÉRENCE `profils` ET NON UN NOM EN TEXTE
-- -----------------------------------------------------------------------------
-- Un nom saisi en texte se périme : la personne quitte l'entreprise, change de
-- nom, ou deux membres s'appellent pareil. La référence pointe sur le compte
-- qui a réellement cliqué. `on delete set null` : supprimer un compte ne doit
-- pas effacer la demande ni empêcher sa suppression — on perd le nom, pas le
-- fait que la demande a été traitée, ce qui est le bon compromis.
-- -----------------------------------------------------------------------------


-- =============================================================================
-- 1 · Note interne et trace de traitement — demandes_contact
-- =============================================================================

-- Ce que l'équipe écrit sur la demande. JAMAIS envoyé au demandeur, jamais
-- affiché publiquement : la RLS de cette table n'accorde la lecture qu'à
-- l'équipe, cette colonne en hérite.
alter table public.demandes_contact
  add column if not exists note_interne text;

alter table public.demandes_contact
  add column if not exists traite_par uuid references public.profils(id) on delete set null;

alter table public.demandes_contact
  add column if not exists traite_le timestamptz;

comment on column public.demandes_contact.note_interne is
  'Note de l''équipe sur cette demande (appel passé, prix annoncé, suite à donner). Jamais envoyée au demandeur.';
comment on column public.demandes_contact.traite_par is
  'Compte ayant posé le dernier changement de statut. NULL = statut jamais changé, ou compte supprimé depuis.';
comment on column public.demandes_contact.traite_le is
  'Horodatage du dernier changement de statut. Distinct de traite_notifie_le (0049), qui date le COURRIEL au demandeur.';


-- =============================================================================
-- 2 · Note interne et trace de traitement — candidatures
-- =============================================================================

alter table public.candidatures
  add column if not exists note_interne text;

alter table public.candidatures
  add column if not exists statut_par uuid references public.profils(id) on delete set null;

alter table public.candidatures
  add column if not exists statut_le timestamptz;

comment on column public.candidatures.note_interne is
  'Note de l''équipe sur ce candidat (entrevue, disponibilités réelles, suite à donner). Jamais envoyée au candidat.';


-- =============================================================================
-- 3 · Nouveaux réglages
-- =============================================================================
-- `on conflict (cle) do nothing` — et surtout PAS `do update`. Rejouer cette
-- migration après que quelqu'un a saisi l'URL Rentman dans l'admin ne doit pas
-- la remettre à vide. C'est la différence entre « poser une valeur par défaut »
-- et « imposer une valeur ».
--
-- `publique = true` partout : ces valeurs s'affichent sur le site public, elles
-- n'ont rien de confidentiel.

insert into public.reglages (cle, valeur, description, publique) values
  (
    'lien_rentman',
    '',
    'URL publique de l''inventaire Rentman. Vide = le bouton « Voir l''inventaire » est remplacé par « Demander une location », qui mène au formulaire de contact. Était en dur dans le code (LIEN_RENTMAN) jusqu''au 2 octobre 2026 : changer l''adresse exigeait un déploiement.',
    true
  ),
  (
    'lien_candidature_externe',
    'https://forms.gle/s3wDqWFj3UQU13Q57',
    'Formulaire de candidature externe, proposé en complément de celui du site. Vide = le lien disparaît. Était en dur dans le code (LIEN_CANDIDATURE_EXTERNE).',
    true
  ),
  (
    'delai_reponse_heures',
    '48',
    'Délai de réponse annoncé aux visiteurs, en heures. Apparaît sur la page Contact, dans l''accusé de réception et sur Carrières — trois endroits qui divergeaient dès que l''un changeait. Nombre entier seulement.',
    true
  ),
  (
    'heures_ouverture',
    '',
    'Heures d''ouverture affichées (ex. « Lun–ven, 7 h à 17 h »). Vide = la ligne n''apparaît pas. Le site promet déjà une réponse « pendant les heures ouvrables » sans jamais les nommer.',
    true
  ),
  (
    'reseau_facebook',
    '',
    'URL complète de la page Facebook. Vide = aucune icône affichée.',
    true
  ),
  (
    'reseau_instagram',
    '',
    'URL complète du compte Instagram. Vide = aucune icône affichée.',
    true
  ),
  (
    'reseau_linkedin',
    '',
    'URL complète de la page LinkedIn. Vide = aucune icône affichée.',
    true
  )
on conflict (cle) do nothing;


-- =============================================================================
-- 4 · RLS / GRANT — rien à faire
-- =============================================================================
-- Les politiques portent sur la TABLE, pas sur une liste de colonnes : les
-- nouvelles en héritent.
--
-- Point de sécurité à vérifier plutôt qu'à supposer : `note_interne` ne doit
-- JAMAIS sortir publiquement. Sur `demandes_contact` et `candidatures`, la
-- lecture est déjà réservée à l'équipe authentifiée (0002 et 0017) — `anon` n'a
-- aucune policy SELECT, et 0019 lui révoque même le GRANT sur `candidatures`.
-- La vérification 3 ci-dessous le prouve au lieu de le postuler.


-- =============================================================================
-- VÉRIFICATION APRÈS EXÉCUTION
-- =============================================================================
-- 1) Les colonnes de suivi (doit renvoyer 6 lignes) :
--    select table_name, column_name from information_schema.columns
--    where column_name in ('note_interne','traite_par','traite_le','statut_par','statut_le')
--      and table_name in ('demandes_contact','candidatures')
--    order by table_name, column_name;
--
-- 2) Les sept réglages (doit renvoyer 14 lignes au total dans la table) :
--    select cle, valeur from public.reglages order by cle;
--
-- 3) `note_interne` reste invisible du public — à lancer DÉCONNECTÉ, depuis
--    un terminal, avec la clé anon :
--    curl "<SUPABASE_URL>/rest/v1/demandes_contact?select=note_interne" \
--         -H "apikey: <ANON_KEY>"
--    Attendu : 401, ou 200 avec [] — jamais une note.
