-- =============================================================================
-- 0045 — Statuts retenue/refusée, colonnes d'invitation sur candidatures,
--        verrou anti-auto-rétrogradation sur profils
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — chaque ALTER est `if not exists`/`drop ... if
-- exists`, le rétroremplissage ne touche que les lignes où poste_id est
-- encore NULL.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE — étape 1/3 d'un CRUD complet sur les comptes
-- -----------------------------------------------------------------------------
-- Prépare le terrain pour : invitation avec choix du rôle, lecture,
-- modification, suppression (déjà là), et le déclenchement d'une invitation
-- comme livreur depuis une candidature « Chauffeur-livreur » retenue. Cette
-- migration ne touche AUCUN composant — elle pose seulement le schéma. Voir
-- le rapport de reconnaissance du 27 août 2026 pour le détail de l'existant.
--
-- ⚠️ DÉCISION RENVERSÉE, SCIEMMENT — 27 août 2026 (Moussa)
-- RepertoireLivreurs.tsx citait une décision de Christian : « un candidat
-- retenu comme chauffeur-livreur doit apparaître dans Livreurs SANS qu'on lui
-- crée d'accès au site ». Cette décision est renversée : un candidat retenu
-- POURRA désormais recevoir une invitation, après confirmation explicite
-- dans l'interface — jamais automatique. Le commentaire du composant est mis
-- à jour dans le même chantier (fichier .tsx, hors périmètre de cette
-- migration SQL).
-- =============================================================================


-- =============================================================================
-- 1 · candidatures — statuts retenue / refusée
-- =============================================================================
-- `drop constraint` puis `add constraint`, pas un simple ajout : Postgres ne
-- permet pas de modifier les valeurs d'un `check` existant autrement — même
-- patron que la contrainte de type de postes_carrieres (migration 0015).
--
-- 'traite' RESTE dans la liste : les lignes existantes le portent, et rien ne
-- permet de deviner rétroactivement lesquelles auraient dû être 'retenue' ou
-- 'refusee' — les convertir inventerait une décision jamais prise avec ces
-- mots-là. 'traite' reste donc valide pour toute candidature déjà traitée
-- sans qu'on tranche after-coup, et pour qui préfère encore ne pas trancher
-- retenue/refusée à la clôture d'une candidature.

alter table public.candidatures drop constraint if exists candidatures_statut_check;
alter table public.candidatures
  add constraint candidatures_statut_check
  check (statut in ('nouveau', 'lu', 'traite', 'retenue', 'refusee'));


-- =============================================================================
-- 2 · candidatures — colonnes d'invitation
-- =============================================================================
-- Aucun GRANT nouveau ici : `authenticated` a déjà select/insert/update/delete
-- sur candidatures, table entière (0017 + rattrapage 0038) — un GRANT
-- PostgreSQL ne se découpe jamais par colonne (même constat que 0041).
-- Aucune policy nouvelle non plus : `candidatures_maj_equipe` (admin +
-- editor, 0017) couvre déjà n'importe quelle colonne de la ligne, ces trois-
-- là y compris.

alter table public.candidatures
  add column if not exists invitation_envoyee_le timestamptz,
  add column if not exists compte_id uuid references public.profils(id) on delete set null,
  add column if not exists poste_id  uuid references public.postes_carrieres(id) on delete set null;

-- compte_id : `on delete set null`, PAS cascade — supprimer un compte ne doit
-- jamais effacer la candidature qui a mené à son invitation. C'est un
-- document reçu, pas une donnée dérivée du compte : il doit survivre à sa
-- suppression, exactement comme demandes_contact n'a jamais dépendu d'un
-- compte pour continuer d'exister (voir le rapport de reconnaissance, point 3).
--
-- poste_id : remplace l'identification par titre exact pour les usages qui
-- ont besoin d'un lien fiable — pas `candidatures.postes`, qui reste en
-- place (text[], alimenté par le formulaire public, une candidature peut
-- viser plusieurs postes à la fois). `postes_carrieres.id` ne change jamais ;
-- `titre_fr` peut être renommé depuis /admin/carrieres sans rien casser une
-- fois ce lien posé — contrairement à la comparaison de chaîne actuelle
-- (POSTE_LIVREUR, livreurs/page.tsx).

create index if not exists idx_candidatures_compte_id on public.candidatures (compte_id);
create index if not exists idx_candidatures_poste_id  on public.candidatures (poste_id);


-- =============================================================================
-- 3 · Rétroremplissage de poste_id
-- =============================================================================
-- Rattache une candidature SEULEMENT si `postes` contient EXACTEMENT UN
-- libellé qui correspond à un titre_fr de postes_carrieres — pas simplement
-- un tableau d'un seul élément : une candidature à deux postes dont un seul
-- est reconnu compte aussi comme une correspondance unique. À l'inverse, deux
-- libellés qui correspondent chacun à un poste réel laissent poste_id à NULL
-- : choisir arbitrairement lequel des deux inventerait une intention que la
-- candidature n'exprime pas clairement. `count(distinct ...)`, pas
-- `count(*)` : un libellé dupliqué dans le tableau ne doit pas compter comme
-- deux correspondances différentes vers le même poste.
--
-- ⚠️ AGRÉGATION CLASSIQUE, PAS UNE FONCTION FENÊTRE — corrigé après un premier
-- échec réel à l'exécution (« DISTINCT is not implemented for window
-- functions », 0A000) : PostgreSQL refuse `count(distinct ...) over (...)`,
-- contrairement à un `count(distinct ...)` group by, qui n'a jamais cette
-- restriction. Le `group by c.id` ci-dessous fait le même travail que la
-- version fenêtrée qui a échoué : un groupe par candidature, un compte de
-- postes DISTINCTS dans ce groupe.
--
-- ⚠️ `array_agg`, PAS `min` — second échec réel à l'exécution
-- (« function min(uuid) does not exist », 42883) : PostgreSQL ne définit pas
-- d'agrégat min/max pour uuid (`count(distinct ...)` reste valide, lui : il
-- n'a besoin que d'égalité, que uuid possède, jamais d'un ordre). `array_agg`
-- accepte n'importe quel type — `(array_agg(pc.id))[1]` prend le premier
-- élément du tableau, jamais « le plus petit » : ça n'affirme aucun ordre
-- métier sur un uuid, contrairement à ce qu'aurait suggéré `min`. Sûr même si
-- le même poste apparaît deux fois dans `postes` (libellé dupliqué) : les
-- deux occurrences produisent la même valeur de `pc.id`, le premier élément
-- du tableau est donc identique aux autres. Quand `nb_postes_distincts`
-- vaut 2+, la ligne est de toute façon écartée par le WHERE de l'UPDATE —
-- quel élément le tableau contiendrait alors n'a pas d'importance.

with correspondances as (
  select
    c.id as candidature_id,
    count(distinct pc.id) as nb_postes_distincts,
    (array_agg(pc.id))[1] as poste_trouve
  from public.candidatures c
  cross join lateral unnest(c.postes) as libelle
  join public.postes_carrieres pc on pc.titre_fr = libelle
  where c.poste_id is null
  group by c.id
)
update public.candidatures c
set poste_id = correspondances.poste_trouve
from correspondances
where c.id = correspondances.candidature_id
  and correspondances.nb_postes_distincts = 1;


-- =============================================================================
-- 4 · profils — verrou contre l'auto-rétrogradation
-- =============================================================================
-- `profils_maj_admin` (0002) ne teste que le rôle de l'APPELANT, jamais la
-- ligne ciblée : un admin peut modifier N'IMPORTE QUELLE ligne, y compris la
-- sienne. `interdire_auto_promotion` (0019) ne s'y oppose pas non plus — sa
-- condition (`coalesce(get_user_role(),'') <> 'admin'`) est fausse pour un
-- admin, quelle que soit la ligne visée. Seul changerRole()
-- (admin/utilisateurs/actions.ts) empêche l'auto-modification aujourd'hui,
-- et seulement côté application (`if (user.id === id) return {erreur:
-- 'soi_meme'}`) — un appel direct à l'API REST avec un jeton de session admin
-- le contournerait entièrement.
--
-- Même condition que interdire_auto_promotion pour le service_role et
-- l'éditeur SQL : `auth.uid()` y est NULL, donc jamais bloqué par ce trigger
-- — sinon plus personne ne pourrait réparer un compte cassé (promotion
-- manuelle depuis le SQL Editor, voir 0004/0005).
--
-- Volontairement un SECOND trigger, pas une condition ajoutée dans
-- interdire_auto_promotion : les deux verrous répondent à deux questions
-- indépendantes (« qui peut changer un rôle » vs « peut-on changer LE SIEN,
-- même en étant admin ») — les garder séparés évite qu'une future
-- modification de l'un change accidentellement le comportement de l'autre.

create or replace function public.interdire_auto_retrogradation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and new.id = auth.uid() then
    raise exception 'Un compte ne peut pas changer son propre rôle, même en tant qu''administrateur.';
  end if;
  return new;
end
$$;

drop trigger if exists profils_pas_auto_retrogradation on public.profils;
create trigger profils_pas_auto_retrogradation
  before update on public.profils
  for each row execute function public.interdire_auto_retrogradation();


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- 1. npm run verifier:migrations
--    -- attendu : aucun écart nouveau. Aucun GRANT n'est ajouté par cette
--    migration (section 2) — rien de neuf à ce niveau, la vérification porte
--    sur ce qui existait déjà.
--
-- 2. select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.candidatures'::regclass
--      and conname = 'candidatures_statut_check';
--    -- attendu : les cinq valeurs, nouveau/lu/traite/retenue/refusee.
--
--    Sonde applicative (clé de service, ligne AUDIT_<horodatage> jetable) :
--      INSERT ... statut = 'retenue'    -> 201
--      INSERT ... statut = 'refusee'    -> 201
--      INSERT ... statut = 'peut_etre'  -> refusé (23514, violation de check)
--    Nettoyer immédiatement les lignes de test.
--
-- 3. select count(*) filter (where poste_id is not null) as rattachees,
--           count(*) filter (where poste_id is null)     as non_rattachees
--    from public.candidatures;
--
-- 4. Sonde session — compte ADMIN jetable, jeton de SESSION (pas la clé de
--    service) :
--      PATCH profils?id=eq.<son propre id>  {role: 'editor'}
--      -- attendu : erreur (exception du trigger), role inchangé en base
--      (revérifié à la clé de service après la sonde).
--
-- 5. Sonde session — même compte admin, sur un TIERS :
--      PATCH profils?id=eq.<tiers>  {role: 'editor'}
--      -- attendu : 200, role réellement changé — le trigger ne doit pas
--      bloquer un admin qui modifie quelqu'un d'autre.
--      Restaurer le rôle d'origine du tiers immédiatement après la sonde.
--
-- 6. Sonde CLÉ DE SERVICE — les deux mêmes cas, avec
--    SUPABASE_SERVICE_ROLE_KEY au lieu d'un jeton de session :
--      PATCH profils?id=eq.<n'importe quel id> {role: ...}
--      -- attendu : 200 dans les deux cas. `auth.uid()` est NULL pour ce
--      rôle — le trigger ne doit jamais s'y opposer, sans quoi un compte
--      cassé deviendrait irréparable même depuis le SQL Editor.
-- =============================================================================
