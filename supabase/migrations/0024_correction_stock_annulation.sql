-- =============================================================================
-- 0024 — Corrige restaurer_stock_commande_annulee (0023)
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- 0023 a été jouée puis testée par une vraie annulation de commande (pas
-- juste relue) : l'annulation échouait avec
-- `function public.statut_stock_suggere(text, bigint) does not exist`.
--
-- Cause : `sum(quantite)` sur une colonne `integer` renvoie un `bigint` en
-- Postgres, pas un `integer` — `p.quantite + agg.total` héritait donc de ce
-- type, et aucune surcharge de `statut_stock_suggere` ne prend `bigint` en
-- second argument. Rien à voir avec `ajuster_stock_ligne_commande` (0023 §2) :
-- celle-ci lit `quantite` directement via `returning ... into`, jamais de
-- `sum()`, jamais de promotion de type — c'est pour ça qu'elle avait été
-- testée correcte au moment d'écrire 0023, mais pas l'autre.
--
-- Correction : caster la somme en `integer` avant de l'utiliser. Un
-- dépassement est impossible en pratique (`lignes_commande.quantite` est
-- plafonnée à 99 par ligne, 0021), mais autant rester explicite.
--
-- Preuve que 0023 seule était cassée, avant cette correction : décrémentation
-- à l'insertion d'une ligne testée OK, restauration à l'annulation testée EN
-- ÉCHEC — sur une vraie commande de test, créée puis annulée via la même clé
-- de service que l'application, nettoyée dans un `finally`.
-- =============================================================================

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
      where commande_id = new.id and produit_id is not null
      group by produit_id
    ) agg
    where agg.produit_id = p.id;
  end if;
  return new;
end;
$$;

-- Le trigger existant pointe déjà vers cette fonction (0023) : `create or
-- replace function` suffit, pas besoin de recréer le trigger lui-même.

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- Reprendre le test 2 de 0023 :
--
--   update public.commandes set statut = 'annulee' where id = '<commande>';
--   -- attendu : succès, plus l'erreur "does not exist" sur statut_stock_suggere
--
--   select quantite from public.produits_boutique where id = '<produit>';
--   -- attendu : de nouveau la valeur de départ
-- =============================================================================
