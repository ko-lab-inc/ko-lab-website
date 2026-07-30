-- =============================================================================
-- 0012 — Stockage des photos de réalisations
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- -----------------------------------------------------------------------------
-- POURQUOI CE BUCKET, MAINTENANT
-- -----------------------------------------------------------------------------
-- La table public.realisations existe depuis 0001, avec sa colonne
-- `images jsonb` déjà pensée pour PLUSIEURS photos par réalisation — exactement
-- ce qu'il faut pour une visionneuse. Mais rien ne permettait de les y
-- déposer : la page publique affiche encore trois entrées codées en dur avec
-- des photos de banque, et l'espace équipe n'avait aucun écran pour la table.
--
-- Décision de Christian : « nos réalisations sera pris comme galerie [...] et
-- on fera un slide images [...] et le lier au réglage pour que l'admin
-- puisse mettre les images ». Ce bucket est la moitié « stockage » de cette
-- demande ; l'écran /admin/realisations en est la moitié « interface ».
--
-- Mêmes choix que 0010 pour les photos produit, pour les mêmes raisons —
-- voir ce fichier pour le détail de chaque décision. Résumé : bucket PUBLIC
-- (une photo de réalisation est faite pour être vue), écriture réservée à
-- l'équipe via get_user_role().

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'realisations',
  'realisations',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "realisations_photos_lecture_publique" on storage.objects;
create policy "realisations_photos_lecture_publique"
  on storage.objects for select
  using (bucket_id = 'realisations');

drop policy if exists "realisations_photos_televersement_equipe" on storage.objects;
create policy "realisations_photos_televersement_equipe"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'realisations' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "realisations_photos_remplacement_equipe" on storage.objects;
create policy "realisations_photos_remplacement_equipe"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'realisations' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "realisations_photos_suppression_equipe" on storage.objects;
create policy "realisations_photos_suppression_equipe"
  on storage.objects for delete
  to authenticated
  -- ⚠️ ÉQUIPE, pas seulement admin, à la différence du bucket produits.
  --
  -- Une photo de réalisation se retire une par une, à mesure qu'on
  -- réorganise une série ou qu'on la remplace — un geste d'édition courant.
  -- La suppression d'un PRODUIT entier, elle, est une décision commerciale
  -- (retirer un article du catalogue) réservée à l'admin. Retirer une photo
  -- d'un reportage n'a pas la même portée ; en faire une affaire d'admin
  -- forcerait Christian à solliciter Moussa pour réordonner une galerie.
  using (bucket_id = 'realisations' and public.get_user_role() in ('admin', 'editor'));

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select id, public, file_size_limit from storage.buckets where id = 'realisations';
--
-- Attendu : une ligne, public = true, 5242880.
