-- =============================================================================
-- 0047 — realisations : fiche projet majeure et origine (KO-LAB / expérience passée)
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — `add column if not exists` et un CHECK créé
-- seulement s'il n'existe pas.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE
-- -----------------------------------------------------------------------------
-- Révision du site du 20 septembre 2026, §14 et §15.
--
-- §14 : « Ne pas forcer chaque album à devenir une réalisation. Créer des
-- fiches détaillées seulement pour les projets qui racontent une histoire
-- forte et actuelle. » Il faut donc distinguer, EN BASE, l'album de galerie
-- de la fiche projet — la seconde reçoit sa propre page indexable
-- /realisations/<slug> (§19 : « créer des pages projets indexables pour les
-- réalisations majeures »).
--
-- §15 : « Plusieurs photos proviennent de projets réalisés avant KO-LAB ou
-- sous d'autres structures. Ces images peuvent soutenir l'expérience et le
-- savoir-faire, mais ne doivent pas être présentées comme des réalisations
-- KO-LAB. » Sans colonne, rien dans le site ne peut faire cette différence :
-- c'est `origine` qui la porte, et le libellé « Expérience passée / parcours
-- de l'équipe » s'affiche à partir d'elle.
--
-- Les deux colonnes ont une valeur par défaut qui ne change RIEN à
-- l'existant : les six albums déjà publiés restent des albums de galerie
-- (fiche = false) et des réalisations KO-LAB (origine = 'kolab'). Le tri se
-- fait ensuite dans /admin/realisations, album par album.
-- -----------------------------------------------------------------------------

alter table public.realisations
  add column if not exists fiche boolean not null default false;

alter table public.realisations
  add column if not exists origine text not null default 'kolab';

-- CHECK séparé et conditionnel : `add column ... check (...)` échouerait au
-- rejeu, la contrainte existant déjà.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'realisations_origine_check'
      and conrelid = 'public.realisations'::regclass
  ) then
    alter table public.realisations
      add constraint realisations_origine_check
      check (origine in ('kolab', 'experience_passee'));
  end if;
end
$$;

comment on column public.realisations.fiche is
  'true = projet majeur, avec sa propre page /realisations/<slug> (révision du 20 septembre 2026, §14.1). false = album de la galerie générale.';

comment on column public.realisations.origine is
  'kolab = réalisation KO-LAB. experience_passee = parcours de l''équipe, affiché sous le libellé « Expérience passée » et jamais présenté comme une réalisation KO-LAB (§15).';

-- -----------------------------------------------------------------------------
-- RLS / GRANT : rien à faire. La politique de lecture publique porte sur la
-- table (publie = true), pas sur la liste des colonnes ; les deux nouvelles
-- colonnes en héritent. Aucun GRANT d'écriture n'est accordé à `anon` ici —
-- l'admin écrit avec la session authentifiée, comme pour les autres colonnes.
-- -----------------------------------------------------------------------------

-- Vérification après exécution (doit renvoyer 2 lignes) :
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_name = 'realisations' and column_name in ('fiche', 'origine');
