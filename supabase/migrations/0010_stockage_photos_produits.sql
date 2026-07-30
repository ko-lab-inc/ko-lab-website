-- =============================================================================
-- 0010 — Stockage des photos produit, et saisie dans une seule langue
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- -----------------------------------------------------------------------------
-- PARTIE A — Bucket des photos produit
-- -----------------------------------------------------------------------------
-- Bucket PUBLIC, contrairement à la règle du § 2 du skill sécurité. C'est
-- volontaire et c'est le seul cas : une photo de catalogue est faite pour être
-- vue par n'importe quel visiteur. La passer en privé imposerait une URL
-- signée par image et par page — donc un rendu dynamique là où la boutique
-- vit en cache, pour protéger un contenu déjà destiné au public.
--
-- Ce qui reste verrouillé, c'est l'ÉCRITURE : seule l'équipe téléverse.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produits',
  'produits',
  true,
  -- 5 Mo. Les visuels normalisés du catalogue pèsent 30 à 180 ko ; la limite
  -- est là pour arrêter un téléversement accidentel de 40 Mo, pas pour brider
  -- un usage normal.
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique : c'est ce que « bucket public » signifie déjà côté CDN,
-- la politique le rend explicite au niveau de la table.
drop policy if exists "produits_lecture_publique" on storage.objects;
create policy "produits_lecture_publique"
  on storage.objects for select
  using (bucket_id = 'produits');

-- Écriture réservée à l'équipe. get_user_role() est la même fonction que
-- celle des politiques de 0002 : un seul endroit décide qui est de l'équipe.
drop policy if exists "produits_televersement_equipe" on storage.objects;
create policy "produits_televersement_equipe"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'produits' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "produits_remplacement_equipe" on storage.objects;
create policy "produits_remplacement_equipe"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'produits' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "produits_suppression_admin_storage" on storage.objects;
create policy "produits_suppression_admin_storage"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'produits' and public.get_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- PARTIE B — Une seule langue de saisie
-- -----------------------------------------------------------------------------
-- Décision de Christian : « on ne doit pas entrer les infos dans les deux
-- langues, soit on entre en français, soit en anglais ».
--
-- nom_en devient donc FACULTATIF. Le nom et la description sont saisis dans
-- une langue ; l'autre reste vide, et l'affichage retombe sur celle qui est
-- remplie — un visiteur anglophone voit le texte français plutôt qu'un blanc.
--
-- ⚠️ CE N'EST PAS DE LA TRADUCTION. Une vraie traduction automatique demande
-- un service externe (DeepL, ou une API de modèle de langue), donc un compte
-- au nom de KO-LAB, une clé, et un coût par caractère. Tant qu'il n'y en a
-- pas, la colonne de l'autre langue reste vide et le repli s'applique. La
-- colonne existe déjà : le jour où le service est branché, il la remplit sans
-- rien changer au schéma.
--
-- nom_fr reste OBLIGATOIRE : il faut au moins une langue garantie, sinon un
-- produit peut n'avoir aucun nom du tout. Le français est la langue première
-- du site (CLAUDE.md).

alter table public.produits_boutique alter column nom_en drop not null;

-- -----------------------------------------------------------------------------
-- PARTIE C — Le prix devient obligatoire
-- -----------------------------------------------------------------------------
-- Décision de Christian : « le prix n'est pas sur demande, on va le mettre ».
--
-- Pas de contrainte NOT NULL en base pour autant, et c'est délibéré : la
-- colonne reste nullable pour ne pas bloquer un import ou une reprise de
-- données. C'est le FORMULAIRE qui l'exige désormais — la règle vit là où on
-- la corrige en une ligne, pas dans une contrainte qu'il faudra démonter le
-- jour d'une migration en masse.
--
-- Les douze produits ont tous un prix, il n'y a donc rien à rattraper.

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select id, public, file_size_limit from storage.buckets where id = 'produits';
--
-- Attendu : une ligne, public = true, 5242880.
--
--   select count(*) from public.produits_boutique where prix is null;
--
-- Attendu : 0.
