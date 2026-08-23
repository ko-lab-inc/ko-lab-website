-- =============================================================================
-- 0040 — Concours : table, photos, liens, interrupteur, bucket
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — chaque instruction est `if not exists` / `drop
-- policy if exists` / `on conflict do nothing`.
--
-- -----------------------------------------------------------------------------
-- PATRON SUIVI : realisations (0001, 0002, 0004, 0012) — DEUX ÉCARTS ASSUMÉS
-- -----------------------------------------------------------------------------
-- 1. realisations stocke ses photos dans une colonne `images jsonb` sur la
--    table elle-même. Concours utilise deux tables enfants (`concours_photos`,
--    `concours_liens`) avec clé étrangère — demandé explicitement, pas une
--    dérive : plusieurs photos ET plusieurs liens par concours, chacun avec son
--    propre `ordre`, se normalisent mieux en lignes qu'en tableau JSON à
--    valider côté application.
--
-- 2. Suppression alignée sur le patron realisations, PAS uniforme sur les
--    trois tables — décision confirmée le 23 août 2026, après une première
--    version qui avait mis « équipe » partout :
--      - `concours` (contenu principal, comme une réalisation) : ADMIN SEUL
--        — `concours_suppression_admin`, même politique que
--        `realisations_suppression_admin` (0002). Faire disparaître un
--        concours entier est une décision commerciale, pas un geste d'édition.
--      - `concours_photos` / `concours_liens` (pièces jointes) : ÉQUIPE
--        (admin + editor) — même raison que
--        `realisations_photos_suppression_equipe` (0012) : retirer une photo
--        mal cadrée ou un lien obsolète est un geste d'édition courant, en
--        faire une affaire d'admin forcerait Christian à solliciter Moussa
--        pour réordonner une série de photos.
--
-- -----------------------------------------------------------------------------
-- LE POINT QUI A CASSÉ TROIS MIGRATIONS AVANT CELLE-CI
-- -----------------------------------------------------------------------------
-- 0017, 0019 et 0037 ont chacune posé une politique RLS sans le GRANT de table
-- correspondant (ou l'ont retiré sans mesurer l'effet) — la commande échoue
-- alors AVANT que RLS soit consultée, avec `42501 permission denied for table`,
-- un message qui ressemble à un blocage RLS et qui a fait perdre des heures à
-- chercher la mauvaise cause (voir docs/audits/2026-08-22-audit-securite-
-- reconnaissance.md). Chaque section RLS ci-dessous est donc suivie
-- IMMÉDIATEMENT de ses GRANT, jamais laissés pour une migration séparée.
-- =============================================================================


-- =============================================================================
-- 1 · TABLES
-- =============================================================================

create table if not exists public.concours (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  titre_fr        text not null,
  titre_en        text,
  accroche_fr     text,
  accroche_en     text,
  description_fr  text not null,
  description_en  text,
  reglement_fr    text,
  reglement_en    text,
  date_debut      date,
  date_fin        date,
  publie          boolean not null default false,
  ordre           integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.concours_photos (
  id            uuid primary key default gen_random_uuid(),
  concours_id   uuid not null references public.concours (id) on delete cascade,
  url_stockage  text not null,
  alt_fr        text not null,
  alt_en        text,
  ordre         integer not null default 0
);

create table if not exists public.concours_liens (
  id            uuid primary key default gen_random_uuid(),
  concours_id   uuid not null references public.concours (id) on delete cascade,
  libelle_fr    text not null,
  libelle_en    text,
  -- `https://` validé CÔTÉ APPLICATION (zod), pas ici : les liens sont libres
  -- (Facebook, YouTube, site externe...), aucune contrainte de domaine voulue.
  url           text not null,
  ordre         integer not null default 0
);

create index if not exists idx_concours_publie            on public.concours (publie);
create index if not exists idx_concours_ordre             on public.concours (ordre);
create index if not exists idx_concours_photos_concours_id on public.concours_photos (concours_id);
create index if not exists idx_concours_liens_concours_id  on public.concours_liens (concours_id);


-- =============================================================================
-- 2 · updated_at — trigger réutilisé, pas redéfini
-- =============================================================================
-- `touch_updated_at()` existe depuis 0001 (déjà posé sur realisations). Un
-- oubli sur une future table a déjà faussé le sitemap (postes_carrieres et
-- produits_boutique n'ont pas de updated_at du tout, voir 0038/sitemap.ts) —
-- concours n'a pas le même trou.

drop trigger if exists set_updated_at on public.concours;
create trigger set_updated_at
  before update on public.concours
  for each row execute function public.touch_updated_at();


-- =============================================================================
-- 3 · RLS — concours
-- =============================================================================

alter table public.concours enable row level security;

drop policy if exists "concours_lecture_publique" on public.concours;
create policy "concours_lecture_publique"
  on public.concours for select
  using (publie = true);

drop policy if exists "concours_lecture_equipe" on public.concours;
create policy "concours_lecture_equipe"
  on public.concours for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_insertion_equipe" on public.concours;
create policy "concours_insertion_equipe"
  on public.concours for insert
  to authenticated
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_maj_equipe" on public.concours;
create policy "concours_maj_equipe"
  on public.concours for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

-- ⚠️ ADMIN SEUL, PAS ÉQUIPE — voir la note d'en-tête. Même politique que
-- `realisations_suppression_admin` (0002) : un concours qui disparaît est
-- une décision commerciale, à la différence de ses photos/liens.
drop policy if exists "concours_suppression_admin" on public.concours;
create policy "concours_suppression_admin"
  on public.concours for delete
  to authenticated
  using (public.get_user_role() = 'admin');

-- GRANT — sans ces deux lignes, TOUT ce qui précède échoue en 42501 avant
-- même que RLS soit consultée. Voir la note d'en-tête.
grant select on public.concours to anon;
grant select, insert, update, delete on public.concours to authenticated;


-- =============================================================================
-- 4 · RLS — concours_photos (jointure sur concours.publie)
-- =============================================================================

alter table public.concours_photos enable row level security;

drop policy if exists "concours_photos_lecture_publique" on public.concours_photos;
create policy "concours_photos_lecture_publique"
  on public.concours_photos for select
  using (
    exists (
      select 1 from public.concours c
      where c.id = concours_photos.concours_id and c.publie = true
    )
  );

drop policy if exists "concours_photos_lecture_equipe" on public.concours_photos;
create policy "concours_photos_lecture_equipe"
  on public.concours_photos for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_photos_insertion_equipe" on public.concours_photos;
create policy "concours_photos_insertion_equipe"
  on public.concours_photos for insert
  to authenticated
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_photos_maj_equipe" on public.concours_photos;
create policy "concours_photos_maj_equipe"
  on public.concours_photos for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_photos_suppression_equipe" on public.concours_photos;
create policy "concours_photos_suppression_equipe"
  on public.concours_photos for delete
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

grant select on public.concours_photos to anon;
grant select, insert, update, delete on public.concours_photos to authenticated;


-- =============================================================================
-- 5 · RLS — concours_liens (jointure sur concours.publie)
-- =============================================================================

alter table public.concours_liens enable row level security;

drop policy if exists "concours_liens_lecture_publique" on public.concours_liens;
create policy "concours_liens_lecture_publique"
  on public.concours_liens for select
  using (
    exists (
      select 1 from public.concours c
      where c.id = concours_liens.concours_id and c.publie = true
    )
  );

drop policy if exists "concours_liens_lecture_equipe" on public.concours_liens;
create policy "concours_liens_lecture_equipe"
  on public.concours_liens for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_liens_insertion_equipe" on public.concours_liens;
create policy "concours_liens_insertion_equipe"
  on public.concours_liens for insert
  to authenticated
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_liens_maj_equipe" on public.concours_liens;
create policy "concours_liens_maj_equipe"
  on public.concours_liens for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_liens_suppression_equipe" on public.concours_liens;
create policy "concours_liens_suppression_equipe"
  on public.concours_liens for delete
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

grant select on public.concours_liens to anon;
grant select, insert, update, delete on public.concours_liens to authenticated;


-- =============================================================================
-- 6 · Bucket concours — mêmes contraintes que realisations (0012)
-- =============================================================================
-- Versionné ICI, contrairement au bucket `medias` (créé à la main le
-- 19 août 2026, hors migration) — coût de cet écart : un audit de sécurité
-- entier pour retrouver et corriger ce qui n'avait jamais été déclaré nulle
-- part (0030). On ne recommence pas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'concours',
  'concours',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "concours_photos_lecture_publique_storage" on storage.objects;
create policy "concours_photos_lecture_publique_storage"
  on storage.objects for select
  using (bucket_id = 'concours');

drop policy if exists "concours_photos_televersement_equipe" on storage.objects;
create policy "concours_photos_televersement_equipe"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'concours' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_photos_remplacement_equipe" on storage.objects;
create policy "concours_photos_remplacement_equipe"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'concours' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "concours_photos_suppression_equipe_storage" on storage.objects;
create policy "concours_photos_suppression_equipe_storage"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'concours' and public.get_user_role() in ('admin', 'editor'));


-- =============================================================================
-- 7 · Interrupteur — reglages (clé-valeur, aucun alter table)
-- =============================================================================
-- Faux au départ : la page n'existe pas encore côté code au moment de cette
-- migration. `boutique_active`/`panier_actif`/`solutions_modulaires`
-- démarraient à 'true' parce que la fonctionnalité existait déjà et ne devait
-- rien changer de visible ; concours_actif fait l'inverse pour la même
-- raison — rien à activer avant que l'écran existe.

insert into public.reglages (cle, valeur, description, publique) values
  (
    'concours_actif',
    'false',
    'Page Concours. false la retire de la navigation, de la section accueil, du sitemap, de robots.txt, et rend ses routes introuvables (404) — même mécanique que boutique_active.',
    true
  )
on conflict (cle) do nothing;


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- 1. npm run verifier:migrations
--    -- attendu : aucun écart nouveau (candidatures/medias_emplacements/profils
--    déjà couverts par 0038/0039).
--
-- 2. select cle, valeur from public.reglages where cle = 'concours_actif';
--    -- attendu : une ligne, valeur 'false'.
--
-- 3. select policyname, cmd, roles from pg_policies
--    where schemaname = 'public' and tablename like 'concours%'
--    order by tablename, cmd;
--    -- attendu : 5 lignes par table (select ×2, insert, update, delete) × 3
--    tables = 15 lignes.
--
-- 4. select grantee, table_name, privilege_type from information_schema.role_table_grants
--    where table_name like 'concours%' order by table_name, grantee;
--    -- attendu : anon -> SELECT seul sur les trois tables ; authenticated ->
--    SELECT/INSERT/UPDATE/DELETE sur les trois.
--
-- 5. select id, public, file_size_limit, allowed_mime_types
--    from storage.buckets where id = 'concours';
--    -- attendu : une ligne, public = true, 5242880.
-- =============================================================================
