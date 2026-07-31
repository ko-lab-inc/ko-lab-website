-- =============================================================================
-- 0019 — Durcissement de sécurité (audit du 2026-07-30)
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA. Aucune de ces corrections ne change le
-- comportement du site : elles retirent des droits que personne n'utilise.
--
-- -----------------------------------------------------------------------------
-- CE QUI A ÉTÉ CONSTATÉ, ET CE QUI NE L'A PAS ÉTÉ
-- -----------------------------------------------------------------------------
-- Rien de ce qui suit n'était exploitable au moment de l'audit : le RLS tenait
-- partout, une écriture anonyme est refusée sur les sept tables (testé, 401),
-- et aucune donnée personnelle n'était lisible publiquement.
--
-- Le défaut est ailleurs : sur plusieurs points, le RLS était le SEUL rempart,
-- alors que 0004 pose explicitement la règle inverse (l. 41-43, « Calqués sur
-- les politiques, pas plus larges »). Une seule politique oubliée sur une
-- future table, et la porte s'ouvrait. Ce fichier remet les secondes barrières.
--
-- Deux constats étaient en revanche bien réels et sont corrigés ici : le dépôt
-- anonyme illimité dans le bucket privé `cv` (§2), et le GRANT SELECT accordé
-- à `anon` sur `candidatures` sans que personne ne l'ait écrit (§1).
-- =============================================================================


-- =============================================================================
-- 1 · `anon` détient SELECT sur `candidatures` — RÉVOQUER, ET FERMER LA SOURCE
-- =============================================================================
--
-- MESURÉ, pas déduit. Avec la clé anon publique :
--
--   GET /rest/v1/candidatures?select=*   →  200  []      ← le GRANT existe
--   GET /rest/v1/demandes_contact        →  401  42501   ← pas de GRANT
--   GET /rest/v1/profils                 →  401  42501   ← pas de GRANT
--
-- Un `200 []` et un `401` ne protègent pas de la même manière. Dans le premier
-- cas, le privilège est accordé et seule la politique RLS renvoie l'ensemble
-- vide ; dans le second, Postgres refuse avant même de regarder les lignes.
--
-- D'où vient ce GRANT que personne n'a écrit — 0004, lignes 102-103 :
--
--     alter default privileges in schema public
--       grant select on tables to anon, authenticated;
--
-- Sans `FOR ROLE`, cette instruction s'applique à TOUTE table créée ensuite par
-- le même rôle. 0011 (reglages), 0016 (videos) et 0017 (candidatures) en ont
-- donc hérité automatiquement. 0017 ne granté explicitement que `insert`
-- (l. 224) et ne révoque rien : le SELECT est arrivé tout seul.
--
-- C'est exactement la précaution que 0004 avait prise à la main pour
-- `demandes_contact` (l. 64-68 : « INSERT SEULEMENT, JAMAIS SELECT […] sinon il
-- suffirait qu'une politique saute »), et que la table la plus sensible du
-- projet — nom, téléphone, courriel, ville, parcours, chemin du CV — n'a pas.

revoke select on public.candidatures from anon;

-- Fermer la source, pour que la prochaine table ne reparte pas avec le défaut.
-- Les GRANT explicites déjà posés (0004 partie A, 0011:85-87, 0016:91-92) ne
-- sont pas affectés : `alter default privileges` ne régit que l'avenir.
--
-- ⚠️ À exécuter avec le MÊME rôle que 0004, sinon l'instruction ne trouve rien
-- à révoquer et ne fait silencieusement rien (elle ne lèvera pas d'erreur).
alter default privileges in schema public
  revoke select on tables from anon, authenticated;


-- =============================================================================
-- 2 · Dépôt anonyme illimité dans le bucket privé `cv` — CONSTAT RÉEL
-- =============================================================================
--
-- MESURÉ pendant l'audit, avec la seule clé anon publique :
--
--   POST /storage/v1/object/cv/zzaudit-<horodatage>.pdf   →  200  {"Key": …}
--
-- Le fichier a bien été écrit dans le bucket, puis supprimé. La politique
-- d'origine (0017:261-264) est :
--
--     create policy "cv_depot_public" on storage.objects for insert
--       with check (bucket_id = 'cv');
--
-- Aucune clause `to`, aucune contrainte de chemin, aucune borne. Son
-- commentaire la justifie par le fait que « le nom du fichier est fabriqué
-- côté serveur » : c'est vrai de la Server Action, mais la POLITIQUE, elle,
-- ne l'impose pas. Un appel direct au point d'entrée Storage contourne
-- entièrement le honeypot, la validation Zod et la limite de débit.
--
-- Ce que ça permettait : remplir le stockage de KO-LAB sans limite (coût,
-- quota, fichiers orphelins). Ce que ça ne permettait PAS : relire quoi que
-- ce soit — aucune politique SELECT ne vise `anon` — ni écraser un CV
-- existant, faute de politique UPDATE.
--
-- On garde le dépôt anonyme : le formulaire de candidature doit fonctionner
-- sans compte, c'est sa raison d'être. On le borne.

drop policy if exists "cv_depot_public" on storage.objects;
create policy "cv_depot_public"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'cv'
    -- Un seul niveau, pas de sous-dossier : `cheminCv()` produit toujours
    -- `<nom-assaini>-<horodatage>.<ext>`, jamais de séparateur de chemin.
    and position('/' in name) = 0
    and length(name) between 5 and 120
    -- Extensions du formulaire, en miroir de `allowed_mime_types` du bucket.
    and (name like '%.pdf' or name like '%.doc' or name like '%.docx')
  );

-- ⚠️ CE QUE CETTE POLITIQUE NE FAIT PAS : compter. Le SQL ne sait pas dire
-- « pas plus de trois dépôts par heure et par visiteur ». La vraie protection
-- contre l'inondation reste en amont — Cloudflare, et un captcha si le volume
-- le justifie un jour. Ici on limite ce qu'un dépôt peut être, pas combien.


-- =============================================================================
-- 3 · Insertion publique : forcer le statut d'entrée
-- =============================================================================
--
-- `demandes_contact` et `candidatures` acceptent une insertion anonyme — c'est
-- volontaire, ce sont des formulaires publics. Mais `statut` fait partie des
-- colonnes insérables : un appel direct à l'API peut écrire `statut = 'traite'`
-- dès la création. La demande n'apparaît alors jamais comme nouvelle dans
-- /admin, et personne ne s'aperçoit qu'elle est passée.
--
-- Le DEFAULT de colonne est appliqué AVANT l'évaluation du `with check` : une
-- insertion normale, qui ne mentionne pas `statut`, satisfait donc la clause.

drop policy if exists "demandes_insertion_publique" on public.demandes_contact;
create policy "demandes_insertion_publique"
  on public.demandes_contact for insert
  with check (statut = 'nouveau');

drop policy if exists "candidatures_insertion_publique" on public.candidatures;
create policy "candidatures_insertion_publique"
  on public.candidatures for insert
  with check (statut = 'nouveau');


-- =============================================================================
-- 4 · Bornes de longueur — le miroir en base des schémas Zod
-- =============================================================================
--
-- Les Server Actions valident déjà tout (Zod, bornes hautes sur chaque champ).
-- Mais un appel direct à `/rest/v1/candidatures` avec la clé anon ne passe pas
-- par elles : les colonnes `text` de Postgres n'ont aucune borne, et rien
-- n'empêche d'écrire plusieurs Mo par champ.
--
-- `not valid` : les lignes déjà présentes ne sont pas revalidées, la migration
-- ne peut donc pas échouer sur des données existantes. La contrainte s'applique
-- à tout ce qui entre ensuite.

alter table public.candidatures drop constraint if exists candidatures_longueurs;
alter table public.candidatures add constraint candidatures_longueurs check (
  length(nom) between 2 and 120
  and length(telephone) between 6 and 40
  and length(email) between 5 and 200
  and length(ville) between 2 and 120
  and length(disponibilites) between 2 and 500
  and coalesce(length(experience_texte), 0) <= 2000
  and coalesce(length(source), 0) <= 120
  and coalesce(length(cv_chemin), 0) <= 200
  and coalesce(array_length(postes, 1), 0) between 1 and 20
) not valid;

alter table public.demandes_contact drop constraint if exists demandes_longueurs;
alter table public.demandes_contact add constraint demandes_longueurs check (
  length(nom) between 2 and 120
  and length(email) between 5 and 200
  and coalesce(length(telephone), 0) <= 40
  and coalesce(length(organisation), 0) <= 200
  and length(message) between 2 and 5000
) not valid;


-- =============================================================================
-- 5 · `profils` — le seul point où une escalade serait grave
-- =============================================================================
--
-- 0004:81 accorde `update` sur `public.profils` à `authenticated`, donc à tout
-- compte inscrit — l'inscription publique étant ouverte, à n'importe qui. Seule
-- la politique `profils_maj_admin` (0002:201-206) l'arrête.
--
-- Aucune faille aujourd'hui : la politique est correcte, `using` ET
-- `with check` exigent tous deux `admin`. Mais c'est le seul endroit du schéma
-- où une politique manquante ne donnerait pas « un peu trop de droits » : elle
-- donnerait `role = 'admin'` à qui le demande, et la contrainte
-- `profils_role_check` (0009:69) accepte cette valeur sans broncher.
--
-- Deux verrous, dont un indépendant du RLS.

-- (a) Retirer le privilège brut. Personne ne s'en sert : `changerRole` est la
--     seule action qui écrit dans `profils`, et elle exige déjà `admin`.
revoke update on public.profils from authenticated;

-- (b) Un déclencheur, qui s'applique même si toutes les politiques sautent.
create or replace function public.interdire_auto_promotion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- `auth.uid()` est NULL pour service_role et pour l'éditeur SQL : les
  -- changements de rôle faits à la main (0004, 0005) continuent de passer.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and coalesce(public.get_user_role(), '') <> 'admin' then
    raise exception 'Changement de rôle réservé à un administrateur.';
  end if;
  return new;
end
$$;

drop trigger if exists profils_pas_auto_promotion on public.profils;
create trigger profils_pas_auto_promotion
  before update on public.profils
  for each row execute function public.interdire_auto_promotion();


-- =============================================================================
-- VÉRIFICATION — à refaire après exécution
-- =============================================================================
--
-- 1. `anon` ne doit plus détenir SELECT sur candidatures :
--
--      select grantee, privilege_type
--      from information_schema.role_table_grants
--      where table_schema = 'public' and table_name = 'candidatures';
--      -- attendu : anon → INSERT seulement
--
-- 2. Depuis un terminal, avec la clé anon — les deux doivent échouer :
--
--      curl -s -o /dev/null -w '%{http_code}\n' \
--        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/candidatures?select=*" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"          # attendu : 401
--
--      curl -s -o /dev/null -w '%{http_code}\n' -X POST \
--        "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/cv/x/y.exe" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" --data x  # attendu : 4xx
--
-- 3. Le formulaire de candidature doit continuer de fonctionner de bout en
--    bout : /fr/carrieres/postuler, avec un vrai PDF. C'est le contrôle qui
--    vérifie que le §2 n'a pas été resserré trop fort.
--
-- `npm run audit:supabase` refait les points 1 et 2 automatiquement.
-- =============================================================================
