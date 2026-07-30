-- =============================================================================
-- 0016 — Vidéos pilotables depuis l'espace équipe
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- -----------------------------------------------------------------------------
-- POURQUOI CETTE TABLE
-- -----------------------------------------------------------------------------
-- La bande de vidéos de la page Le LAB (format bambulab.com, demandé par
-- Christian) lisait une constante en dur, `VIDEOS_LAB` dans lib/videos.ts.
-- Décision de Christian : « je voudrais avoir un espace dans admin où je
-- pourrai ajouter des liens pour que les vidéos apparaissent ici, avec la
-- possibilité de mettre beaucoup de liens qui seront en slide ». Même
-- trajectoire que le catalogue, les réalisations et les carrières : le
-- contenu quitte le code pour la base, et l'équipe l'alimente sans
-- redéploiement.
--
-- -----------------------------------------------------------------------------
-- CE QUE LA TABLE NE STOCKE PAS
-- -----------------------------------------------------------------------------
-- Pas de vignette obligatoire. Pour une URL YouTube, la vignette se déduit de
-- l'identifiant de la vidéo (voir lib/utils/youtube.ts) — Christian n'a qu'un
-- lien à coller, ce qu'il a demandé explicitement. `vignette` reste là pour
-- les cas où l'on veut imposer une image précise (autre hébergeur, ou
-- miniature YouTube jugée mauvaise).
--
-- Pas de durée, pas de nom de chaîne, pas de compteur de vues : ce sont des
-- données qui vivent chez l'hébergeur et qui périment. Les afficher
-- obligerait à les resynchroniser, ou à mentir.

create table if not exists public.videos (
  id         uuid primary key default gen_random_uuid(),
  titre      text not null,
  url        text not null,

  -- Vignette imposée. NULL = déduite de l'URL (YouTube uniquement).
  vignette   text,

  actif      boolean not null default true,
  ordre      integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_videos_actif on public.videos (actif);
create index if not exists idx_videos_ordre on public.videos (ordre);

-- =============================================================================
-- RLS — mêmes règles que postes_carrieres (0002)
-- =============================================================================
alter table public.videos enable row level security;

-- Lecture publique des seules vidéos actives : c'est ce que sert la page
-- Le LAB, via la clé anon.
drop policy if exists "videos_lecture_publique" on public.videos;
create policy "videos_lecture_publique"
  on public.videos for select
  using (actif = true);

-- L'équipe voit TOUT, y compris ce qui est hors ligne — sinon l'écran
-- d'administration ne pourrait pas republier ce qu'il a masqué.
drop policy if exists "videos_lecture_equipe" on public.videos;
create policy "videos_lecture_equipe"
  on public.videos for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "videos_ecriture_equipe" on public.videos;
create policy "videos_ecriture_equipe"
  on public.videos for insert
  to authenticated
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "videos_maj_equipe" on public.videos;
create policy "videos_maj_equipe"
  on public.videos for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

-- Suppression réservée à l'admin, comme partout ailleurs.
drop policy if exists "videos_suppression_admin" on public.videos;
create policy "videos_suppression_admin"
  on public.videos for delete
  to authenticated
  using (public.get_user_role() = 'admin');

-- =============================================================================
-- GRANTS — voir 0004 pour le raisonnement
-- =============================================================================
grant select on public.videos to anon;
grant select, insert, update, delete on public.videos to authenticated;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select id, titre, url, actif, ordre from public.videos order by ordre;
--
-- Attendu : zéro ligne au départ. La page Le LAB affiche alors quatre
-- emplacements « Vidéo à venir » — voir BandeauVideos.tsx.
