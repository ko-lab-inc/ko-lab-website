-- =============================================================================
-- 0025 — Empêche la double restauration de stock (annulation + suppression de compte)
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- Trouvé en testant en réel, pas en relisant 0023/0024 : annuler une commande
-- restaure son stock (correct), mais supprimer ENSUITE le compte client de
-- cette commande annulée le restaure UNE SECONDE FOIS.
--
-- -----------------------------------------------------------------------------
-- POURQUOI ÇA ARRIVE
-- -----------------------------------------------------------------------------
-- Supprimer un compte (supprimerUtilisateur, admin/utilisateurs/actions.ts)
-- déclenche la cascade auth.users → commandes → lignes_commande (0001, 0021).
-- `commandes_restaurer_stock_annulation` (0023) est un trigger AFTER UPDATE :
-- il ne se déclenche PAS quand la ligne commandes est supprimée par la
-- cascade, seulement quand elle passe explicitement à 'annulee'. Mais
-- `lignes_commande_ajuster_stock` (0023) est AFTER INSERT OR DELETE : la
-- suppression en cascade des lignes le déclenche, et sa version actuelle
-- restaure INCONDITIONNELLEMENT — y compris pour des lignes dont le stock a
-- déjà été rendu au moment de l'annulation.
--
-- Pire : au moment où le trigger de lignes_commande s'exécute pendant la
-- cascade, la ligne `commandes` correspondante est DÉJÀ supprimée (l'action en
-- cascade de Postgres retire la ligne référencée avant de propager vers la
-- table qui la référence) — impossible de relire `commandes.statut` depuis ce
-- trigger pour savoir si le stock a déjà été rendu.
--
-- Preuve : commande de test, 2 unités décrémentées, annulée (stock restauré,
-- 14 → 12 → 14), puis compte supprimé — stock observé à 16, pas 14.
--
-- -----------------------------------------------------------------------------
-- CORRECTIF : LA MÉMOIRE VIT SUR LA LIGNE, PAS SUR LA COMMANDE
-- -----------------------------------------------------------------------------
-- Puisque la commande peut disparaître avant que la ligne ne soit traitée, le
-- drapeau « stock déjà rendu » doit vivre SUR `lignes_commande` elle-même —
-- la seule ligne garantie accessible (`old`) au moment du DELETE, cascade ou
-- non. `restaurer_stock_commande_annulee` (0023) le pose à `true` sur toutes
-- les lignes de la commande au moment de l'annulation ; le trigger de
-- lignes_commande ne restaure que si ce drapeau est encore `false`.
-- =============================================================================

alter table public.lignes_commande
  add column if not exists stock_restaure boolean not null default false;

comment on column public.lignes_commande.stock_restaure is
  'Vrai une fois le stock de cette ligne rendu à produits_boutique (annulation, 0025). '
  'Empêche une seconde restauration si la ligne est supprimée après coup (suppression de compte, ménage manuel).';


create or replace function public.ajuster_stock_ligne_commande()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nouvelle_quantite integer;
begin
  if TG_OP = 'INSERT' then
    if new.produit_id is not null then
      update public.produits_boutique
      set quantite = greatest(0, quantite - new.quantite)
      where id = new.produit_id
      returning quantite into nouvelle_quantite;

      update public.produits_boutique
      set statut_stock = public.statut_stock_suggere(statut_stock, nouvelle_quantite)
      where id = new.produit_id;
    end if;
    return new;

  elsif TG_OP = 'DELETE' then
    if old.produit_id is not null and not old.stock_restaure then
      update public.produits_boutique
      set quantite = quantite + old.quantite
      where id = old.produit_id
      returning quantite into nouvelle_quantite;

      update public.produits_boutique
      set statut_stock = public.statut_stock_suggere(statut_stock, nouvelle_quantite)
      where id = old.produit_id;
    end if;
    return old;
  end if;

  return null;
end;
$$;


create or replace function public.restaurer_stock_commande_annulee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.statut = 'annulee' and old.statut is distinct from 'annulee' then
    update public.produits_boutique p
    set quantite = p.quantite + agg.total,
        statut_stock = public.statut_stock_suggere(p.statut_stock, p.quantite + agg.total)
    from (
      select produit_id, sum(quantite)::integer as total
      from public.lignes_commande
      where commande_id = new.id and produit_id is not null and not stock_restaure
      group by produit_id
    ) agg
    where agg.produit_id = p.id;

    -- Marque les lignes traitées AVANT qu'une suppression ultérieure (compte,
    -- ménage manuel) ne puisse les faire restaurer une seconde fois.
    update public.lignes_commande
    set stock_restaure = true
    where commande_id = new.id and produit_id is not null and not stock_restaure;
  end if;
  return new;
end;
$$;

-- Les deux triggers (0023) pointent déjà vers ces fonctions — `create or
-- replace function` suffit, aucun trigger à recréer.

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- Reproduire exactement le scénario qui a révélé le bug :
--
--   1. Noter la quantité N d'un produit.
--   2. Créer une commande avec une ligne de ce produit (quantité Q).
--      -- attendu : quantité = N - Q
--   3. Annuler la commande (update commandes set statut = 'annulee').
--      -- attendu : quantité = N, et lignes_commande.stock_restaure = true
--      --           pour cette ligne
--   4. Supprimer le compte client (auth.admin.deleteUser) — cascade jusqu'à
--      lignes_commande.
--      -- attendu : quantité TOUJOURS N, pas N + Q
--
--   5. Cas non régressif — modification dans la fenêtre de 48h : supprimer
--      une ligne d'une commande encore 'nouvelle'/'confirmee' (jamais
--      annulée, stock_restaure = false) doit continuer à restaurer
--      normalement.
-- =============================================================================
