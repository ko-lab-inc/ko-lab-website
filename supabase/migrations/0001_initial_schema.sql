-- =============================================================================
-- KO-LAB — 0001 : schéma initial
-- =============================================================================
-- À exécuter EN PREMIER dans Supabase SQL Editor.
-- Résultat attendu : « Success. No rows returned ».
--
-- ÉCART ASSUMÉ AU SKILL 03 — les NOT NULL
-- Le skill écrit `publie boolean DEFAULT false`. Un DEFAULT n'implique PAS
-- NOT NULL : la colonne accepte encore NULL, et le générateur de types produit
-- alors `boolean | null`. Chaque lecture devrait gérer trois états là où deux
-- suffisent, dans toute la couche affichage.
-- Les colonnes à valeur par défaut sont donc déclarées NOT NULL.
-- =============================================================================

-- gen_random_uuid() vient de pgcrypto. Activée par défaut sur Supabase, mais
-- l'appel explicite rend la migration rejouable sur une base vierge.
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- realisations — galerie filtrable (skills 03 et 21)
-- -----------------------------------------------------------------------------
create table if not exists public.realisations (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  titre_fr       text not null,
  titre_en       text not null,
  description_fr text,
  description_en text,

  -- Contrainte plutôt qu'un simple commentaire : une catégorie mal orthographiée
  -- ferait disparaître la réalisation de tous les filtres, sans erreur.
  categorie      text not null
                 check (categorie in ('terrain', 'installation', 'lab', 'equipement')),

  tags           text[] not null default '{}',
  -- [{ url, alt_fr, alt_en, ordre }] — validé côté application (skill 09),
  -- Postgres ne garantit pas la forme d'un jsonb.
  images         jsonb  not null default '[]'::jsonb,

  publie         boolean not null default false,
  ordre          integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- produits_boutique — catalogue sur commande (skill 21, phase 1)
-- -----------------------------------------------------------------------------
create table if not exists public.produits_boutique (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  marque         text not null,
  categorie      text not null,
  nom_fr         text not null,
  nom_en         text not null,
  description_fr text,
  description_en text,

  -- Reste nullable VOLONTAIREMENT : NULL signifie « sur demande », ce que la
  -- page boutique affiche déjà. C'est une information, pas une absence.
  prix           numeric(10, 2),

  images         jsonb not null default '[]'::jsonb,
  specs          jsonb not null default '{}'::jsonb,
  url_externe    text,

  publie         boolean not null default false,
  ordre          integer not null default 0,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- demandes_contact — formulaire de contact (skill 05)
-- -----------------------------------------------------------------------------
create table if not exists public.demandes_contact (
  id           uuid primary key default gen_random_uuid(),

  -- Mêmes valeurs que TYPES_DEMANDE dans src/types/index.ts et que le schéma
  -- Zod de src/lib/validation.ts. Trois endroits, une seule liste.
  type         text not null
               check (type in ('mandat', 'location', 'boutique', 'carriere', 'autre')),

  nom          text not null,
  email        text not null,
  telephone    text,
  organisation text,
  message      text not null,

  statut       text not null default 'nouveau'
               check (statut in ('nouveau', 'lu', 'traite')),

  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- postes_carrieres
-- -----------------------------------------------------------------------------
create table if not exists public.postes_carrieres (
  id             uuid primary key default gen_random_uuid(),
  titre_fr       text not null,
  titre_en       text not null,
  departement    text not null,

  type           text not null
                 check (type in ('temps-plein', 'temps-partiel', 'contrat')),

  description_fr text,
  description_en text,
  exigences_fr   text,
  exigences_en   text,

  actif          boolean not null default true,
  ordre          integer not null default 0,
  created_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- profils — RBAC (skill 24)
-- -----------------------------------------------------------------------------
create table if not exists public.profils (
  id    uuid primary key references auth.users on delete cascade,
  role  text not null default 'editor' check (role in ('admin', 'editor')),
  nom   text,
  email text
);

-- -----------------------------------------------------------------------------
-- Index — filtres de la galerie (skill 03)
-- -----------------------------------------------------------------------------
create index if not exists idx_realisations_categorie on public.realisations (categorie);
create index if not exists idx_realisations_publie    on public.realisations (publie);
create index if not exists idx_realisations_ordre     on public.realisations (ordre);

create index if not exists idx_produits_publie   on public.produits_boutique (publie);
create index if not exists idx_produits_marque   on public.produits_boutique (marque);
create index if not exists idx_produits_ordre    on public.produits_boutique (ordre);

create index if not exists idx_postes_actif on public.postes_carrieres (actif);

-- Les demandes se consultent des plus récentes aux plus anciennes.
create index if not exists idx_demandes_created on public.demandes_contact (created_at desc);
create index if not exists idx_demandes_statut  on public.demandes_contact (statut);

-- -----------------------------------------------------------------------------
-- updated_at — tenu à jour par la base
-- -----------------------------------------------------------------------------
-- Confier ce champ à l'application garantit qu'il finira par être oublié
-- quelque part.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.realisations;
create trigger set_updated_at
  before update on public.realisations
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Création automatique du profil à l'inscription (skill 24)
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER : la fonction doit écrire dans public.profils alors que
-- l'utilisateur qui vient de s'inscrire n'a encore aucun droit.
-- `set search_path = ''` est indispensable avec SECURITY DEFINER : sans ça, un
-- utilisateur pourrait créer un objet homonyme dans un schéma prioritaire et
-- détourner l'exécution. D'où les noms pleinement qualifiés ci-dessous.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profils (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
