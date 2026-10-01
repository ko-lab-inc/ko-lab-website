-- =============================================================================
-- 0048 — articles_location : copie locale du catalogue de location Rentman
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — `if not exists`, `drop policy if exists`,
-- `on conflict do update`.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE
-- -----------------------------------------------------------------------------
-- Révision du 20 septembre 2026, §5 (« Intégration Rentman ») : le client doit
-- rester dans l'univers KO-LAB plutôt que d'être envoyé vers une interface
-- externe, les produits doivent avoir du HTML indexable et de vraies URL
-- KO-LAB, et il faut « réutiliser les données Rentman plutôt que dupliquer
-- manuellement le catalogue ».
--
-- Cette table est la COPIE LOCALE de ce catalogue. Rentman reste la source de
-- vérité ; le site ne l'interroge jamais au moment du rendu d'une page.
--
-- POURQUOI UNE COPIE, et pas un appel direct à l'API à chaque visite :
--   1. Latence — l'API Rentman est hors de notre région Vercel (iad1) ; une
--      page catalogue ferait deux allers-retours transatlantiques avant
--      d'afficher quoi que ce soit. La cible du projet est p95 < 300 ms.
--   2. Quotas — l'API n'annonce aucun en-tête de quota (vérifié le
--      1er octobre 2026 : aucun `x-ratelimit-*` en réponse). Un plafond non
--      documenté est un plafond qu'on découvre en production.
--   3. Disponibilité — Rentman en panne ne doit pas vider la page Location.
--   4. Maîtrise — `publie` ci-dessous est posé par la synchronisation à
--      partir du champ `in_shop` de Rentman, mais rien n'oblige le site à
--      suivre Rentman aveuglément si un article doit être retiré en urgence.
--
-- CE QUI N'EST JAMAIS COPIÉ ICI : le champ `internal_remark` de Rentman
-- (« Stock principal : 3D SHOP. À valider lors de… »), présent sur 497 des
-- 584 articles au 1er octobre 2026. C'est une note d'entrepôt, pas un texte
-- public. Aucune colonne de cette table ne peut l'accueillir — c'est
-- volontaire : une colonne qui existe finit par être remplie.
--
-- SOURCE DES TEXTES : le champ `external_remark` de Rentman, déjà bilingue
-- au format « français / anglais » séparé par « / ». Mesuré sur les 538
-- articles qui en ont un : 498 à séparateur unique, dont 497 se coupent
-- proprement, 0 coupe douteuse. Les 39 sans séparateur sont des notes
-- internes mal rangées (« BOITE », « Manque la base ») — raison de plus pour
-- que `publie` dépende d'un geste humain dans Rentman et non d'une heuristique.
-- -----------------------------------------------------------------------------


-- =============================================================================
-- 1 · Table
-- =============================================================================

create table if not exists public.articles_location (
  id uuid primary key default gen_random_uuid(),

  -- Clé de rapprochement avec Rentman. UNIQUE : c'est elle qui décide si la
  -- synchronisation insère ou met à jour, jamais le nom ni le slug.
  rentman_id integer not null unique,

  -- URL publique : /location/<categorie>/<slug>. Calculé par la
  -- synchronisation à partir du nom, stable une fois posé — un slug qui
  -- changerait casserait une URL déjà indexée par Google.
  slug text not null unique,

  nom_fr text not null,
  nom_en text not null,
  description_fr text,
  description_en text,

  -- Une des sept catégories déjà affichées sur /location (voir le tableau
  -- `categories` de (marketing)/[locale]/location/page.tsx). Rentman a ses
  -- propres dossiers, plus fins (50, dont 18 sous-dossiers) : le
  -- rapprochement est fait par la synchronisation, pas par la base.
  categorie text not null,

  -- Dossier Rentman d'origine, conservé pour la traçabilité : sans lui,
  -- impossible de savoir pourquoi un article a atterri dans telle catégorie
  -- du site, ni de repérer un dossier Rentman que la table de correspondance
  -- ne connaît pas encore.
  dossier_rentman text,

  prix numeric(10, 2),
  tags text[] not null default '{}',

  -- Photo RECOPIÉE dans le bucket `location` ci-dessous, jamais l'URL
  -- Rentman : celle-ci est une URL S3 signée (elle refuse d'ailleurs la
  -- requête si on lui envoie le jeton d'API) et son alternative `proxy_url`
  -- porte un JWT. Construire les pages publiques sur un lien signé par un
  -- tiers, c'est accepter que le catalogue se casse le jour où ce lien
  -- expire.
  image_url text,
  image_alt_fr text,
  image_alt_en text,

  -- Posé par la synchronisation depuis `in_shop` (Rentman). Au 1er octobre
  -- 2026 : 0 article sur 584 porte ce drapeau, donc cette table reste vide
  -- tant que KO-LAB n'a pas coché la case article par article. C'est voulu —
  -- voir la note d'en-tête sur les 39 descriptions qui sont en réalité des
  -- notes d'entrepôt.
  publie boolean not null default false,

  ordre integer not null default 0,

  -- `modified` de Rentman. Permet une synchronisation incrémentale : on ne
  -- réécrit que ce qui a bougé depuis la dernière passe.
  rentman_modifie_le timestamptz,
  synchronise_le timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CHECK séparé et conditionnel : `create table if not exists` ne rejouerait
-- pas une contrainte inline si la table existe déjà.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'articles_location_categorie_check'
      and conrelid = 'public.articles_location'::regclass
  ) then
    alter table public.articles_location
      add constraint articles_location_categorie_check
      check (categorie in (
        'mobilier', 'scenes', 'clotures', 'eclairage',
        'decor', 'equipements_terrain', 'infrastructures'
      ));
  end if;
end
$$;

-- La page catalogue filtre sur (publie, categorie) et trie sur (ordre, nom).
create index if not exists articles_location_publie_categorie_idx
  on public.articles_location (categorie, ordre)
  where publie;

comment on table public.articles_location is
  'Copie locale du catalogue de location Rentman (révision du 20 septembre 2026, §5). Rentman reste la source de vérité ; la synchronisation écrit ici. Ne contient JAMAIS internal_remark.';
comment on column public.articles_location.publie is
  'Reflet du champ in_shop de Rentman. false = l''article n''apparaît nulle part sur le site public.';
comment on column public.articles_location.image_url is
  'URL dans le bucket Storage `location`, jamais l''URL Rentman (signée, expirable).';


-- =============================================================================
-- 2 · updated_at — trigger réutilisé, pas redéfini
-- =============================================================================
-- `touch_updated_at()` existe depuis 0001.

drop trigger if exists set_updated_at on public.articles_location;
create trigger set_updated_at
  before update on public.articles_location
  for each row execute function public.touch_updated_at();


-- =============================================================================
-- 3 · RLS
-- =============================================================================

alter table public.articles_location enable row level security;

-- Lecture publique CONDITIONNELLE, à la différence de galeries_photos : un
-- article non publié est un article que KO-LAB n'a pas (encore) voulu
-- montrer. `using (publie)` et non `using (true)` — la cible du projet est
-- zéro policy `using (true)` sur SELECT hors cas documenté.
drop policy if exists "articles_location_lecture_publique" on public.articles_location;
create policy "articles_location_lecture_publique"
  on public.articles_location for select
  using (publie);

-- L'équipe voit TOUT, y compris les articles non publiés : sans ça, un futur
-- écran d'admin ne pourrait pas afficher ce qui attend une photo.
drop policy if exists "articles_location_lecture_equipe" on public.articles_location;
create policy "articles_location_lecture_equipe"
  on public.articles_location for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

-- UPDATE seulement, volontairement : l'équipe ajuste `ordre`, `categorie` ou
-- un texte alternatif depuis l'admin. INSERT et DELETE n'ont PAS de policy —
-- la table est alimentée par la synchronisation, qui s'exécute côté serveur
-- avec la clé de service et ne passe donc pas par RLS. Un article créé à la
-- main ici serait écrasé ou orphelin à la passe suivante.
drop policy if exists "articles_location_maj_equipe" on public.articles_location;
create policy "articles_location_maj_equipe"
  on public.articles_location for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

-- GRANT — sans ces lignes, tout ce qui précède échoue en 42501 avant même que
-- RLS soit consultée (leçon des migrations 0017, 0019 et 0037).
-- Pas de insert/delete pour `authenticated` : voir juste au-dessus.
grant select on public.articles_location to anon;
grant select, update on public.articles_location to authenticated;


-- =============================================================================
-- 4 · Bucket `location` — photos recopiées depuis Rentman
-- =============================================================================
-- Mêmes choix que 0010 (produits) et 0012 (réalisations) : bucket PUBLIC (une
-- photo de catalogue est faite pour être vue), écriture réservée à l'équipe.
--
-- 5 Mo par fichier : les photos arrivent de Rentman en PNG/JPEG non optimisés
-- (la seule présente au 1er octobre 2026 fait 366 Ko, mais rien ne garantit
-- la suite). La synchronisation les réencode avant dépôt ; cette limite est
-- le garde-fou, pas la cible.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'location',
  'location',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "location_photos_lecture_publique" on storage.objects;
create policy "location_photos_lecture_publique"
  on storage.objects for select
  using (bucket_id = 'location');

drop policy if exists "location_photos_televersement_equipe" on storage.objects;
create policy "location_photos_televersement_equipe"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'location' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "location_photos_remplacement_equipe" on storage.objects;
create policy "location_photos_remplacement_equipe"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'location' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "location_photos_suppression_equipe" on storage.objects;
create policy "location_photos_suppression_equipe"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'location' and public.get_user_role() in ('admin', 'editor'));


-- =============================================================================
-- VÉRIFICATION APRÈS EXÉCUTION
-- =============================================================================
-- 1) La table et ses colonnes (doit renvoyer 20 lignes) :
--    select column_name, data_type
--    from information_schema.columns
--    where table_name = 'articles_location' order by ordinal_position;
--
-- 2) La RLS est bien active et les policies posées (doit renvoyer 3 lignes) :
--    select policyname, cmd from pg_policies
--    where tablename = 'articles_location';
--
-- 3) Aucune policy d'INSERT ou de DELETE (doit renvoyer 0 ligne) :
--    select policyname from pg_policies
--    where tablename = 'articles_location' and cmd in ('INSERT', 'DELETE');
--
-- 4) Le bucket (doit renvoyer une ligne, public = true, 5242880) :
--    select id, public, file_size_limit from storage.buckets where id = 'location';
