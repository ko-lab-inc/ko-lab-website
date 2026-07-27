-- =============================================================================
-- KO-LAB — 0002 : Row Level Security
-- =============================================================================
-- À exécuter APRÈS 0001. Résultat attendu : « Success. No rows returned ».
--
-- Principe : la clé anon est publique — elle voyage dans le bundle navigateur.
-- Ce n'est donc PAS elle qui protège les données, c'est le RLS. Toute table
-- sans politique est soit inaccessible, soit entièrement exposée.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rôle de l'utilisateur connecté (skill 24)
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER : les politiques doivent lire public.profils, alors que les
-- politiques de profils elles-mêmes s'appuient sur cette fonction. Sans
-- élévation, la récursion bloquerait toute lecture.
--
-- `set search_path = ''` ferme le détournement par objet homonyme.
-- `stable` autorise Postgres à mémoïser l'appel dans une même requête, au lieu
-- de le réévaluer pour chaque ligne examinée.
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.profils where id = auth.uid();
$$;

-- =============================================================================
-- Activation — AVANT les politiques.
-- Une table avec RLS activé et aucune politique refuse tout, ce qui est le bon
-- état par défaut.
-- =============================================================================
alter table public.realisations      enable row level security;
alter table public.produits_boutique enable row level security;
alter table public.demandes_contact  enable row level security;
alter table public.postes_carrieres  enable row level security;
alter table public.profils           enable row level security;

-- =============================================================================
-- realisations
-- =============================================================================

-- Public : uniquement ce qui est publié. Un brouillon reste invisible même en
-- connaissant son identifiant.
drop policy if exists "realisations_lecture_publique" on public.realisations;
create policy "realisations_lecture_publique"
  on public.realisations for select
  using (publie = true);

-- Éditeurs et admins voient tout, brouillons compris.
drop policy if exists "realisations_lecture_equipe" on public.realisations;
create policy "realisations_lecture_equipe"
  on public.realisations for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "realisations_insertion_equipe" on public.realisations;
create policy "realisations_insertion_equipe"
  on public.realisations for insert
  to authenticated
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "realisations_maj_equipe" on public.realisations;
create policy "realisations_maj_equipe"
  on public.realisations for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

-- Suppression réservée à l'admin — skill 24 : l'éditeur ne supprime pas.
drop policy if exists "realisations_suppression_admin" on public.realisations;
create policy "realisations_suppression_admin"
  on public.realisations for delete
  to authenticated
  using (public.get_user_role() = 'admin');

-- =============================================================================
-- produits_boutique
-- =============================================================================
drop policy if exists "produits_lecture_publique" on public.produits_boutique;
create policy "produits_lecture_publique"
  on public.produits_boutique for select
  using (publie = true);

drop policy if exists "produits_lecture_equipe" on public.produits_boutique;
create policy "produits_lecture_equipe"
  on public.produits_boutique for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "produits_insertion_equipe" on public.produits_boutique;
create policy "produits_insertion_equipe"
  on public.produits_boutique for insert
  to authenticated
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "produits_maj_equipe" on public.produits_boutique;
create policy "produits_maj_equipe"
  on public.produits_boutique for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "produits_suppression_admin" on public.produits_boutique;
create policy "produits_suppression_admin"
  on public.produits_boutique for delete
  to authenticated
  using (public.get_user_role() = 'admin');

-- =============================================================================
-- postes_carrieres
-- =============================================================================
drop policy if exists "postes_lecture_publique" on public.postes_carrieres;
create policy "postes_lecture_publique"
  on public.postes_carrieres for select
  using (actif = true);

drop policy if exists "postes_lecture_equipe" on public.postes_carrieres;
create policy "postes_lecture_equipe"
  on public.postes_carrieres for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "postes_ecriture_equipe" on public.postes_carrieres;
create policy "postes_ecriture_equipe"
  on public.postes_carrieres for insert
  to authenticated
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "postes_maj_equipe" on public.postes_carrieres;
create policy "postes_maj_equipe"
  on public.postes_carrieres for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "postes_suppression_admin" on public.postes_carrieres;
create policy "postes_suppression_admin"
  on public.postes_carrieres for delete
  to authenticated
  using (public.get_user_role() = 'admin');

-- =============================================================================
-- demandes_contact — la table la plus sensible
-- =============================================================================
-- ⚠️ AUCUNE politique SELECT publique, volontairement. Les demandes contiennent
-- des noms, courriels et téléphones : une lecture anonyme exposerait tout le
-- carnet de contacts à quiconque possède la clé anon, c'est-à-dire n'importe
-- quel visiteur.
--
-- L'API route écrit avec la service role key, qui contourne le RLS — elle n'a
-- donc besoin d'aucune politique. Celle qui suit sert au cas où le formulaire
-- passerait un jour directement par la clé anon.
drop policy if exists "demandes_insertion_publique" on public.demandes_contact;
create policy "demandes_insertion_publique"
  on public.demandes_contact for insert
  with check (true);

drop policy if exists "demandes_lecture_equipe" on public.demandes_contact;
create policy "demandes_lecture_equipe"
  on public.demandes_contact for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "demandes_maj_equipe" on public.demandes_contact;
create policy "demandes_maj_equipe"
  on public.demandes_contact for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "demandes_suppression_admin" on public.demandes_contact;
create policy "demandes_suppression_admin"
  on public.demandes_contact for delete
  to authenticated
  using (public.get_user_role() = 'admin');

-- =============================================================================
-- profils
-- =============================================================================
-- Chacun lit son propre profil. Sans cette politique, get_user_role() ne
-- renverrait rien et toutes les politiques d'équipe échoueraient.
drop policy if exists "profils_lecture_soi" on public.profils;
create policy "profils_lecture_soi"
  on public.profils for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profils_lecture_admin" on public.profils;
create policy "profils_lecture_admin"
  on public.profils for select
  to authenticated
  using (public.get_user_role() = 'admin');

-- ⚠️ Aucune politique UPDATE pour l'utilisateur sur son propre profil :
-- elle lui permettrait de passer son `role` à 'admin'. Les changements de rôle
-- se font à la service role key, hors de portée du RLS.
drop policy if exists "profils_maj_admin" on public.profils;
create policy "profils_maj_admin"
  on public.profils for update
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');
