-- =============================================================================
-- 0023 — Le stock varie avec les commandes
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- Demande de Christian, 2 août 2026 : « le stock doit varier en fonction des
-- achats ». Ça change ce que disait 0013 : « aucune commande ne la décrémente
-- automatiquement, le site fonctionne sur demande de prix, pas sur achat
-- direct » — c'était vrai à l'écriture de 0013, ça ne l'est plus depuis 0021,
-- qui a fait passer le panier de demande de prix à un vrai flux de commande
-- (quantités fermes, statut, fenêtre de 48h). Le commentaire de colonne est
-- corrigé plus bas pour ne pas laisser cette affirmation devenue fausse.
--
-- -----------------------------------------------------------------------------
-- POURQUOI UN DÉCLENCHEUR, PAS UN AJOUT DANS creerCommande
-- -----------------------------------------------------------------------------
-- creerCommande (boutique/commande/details/actions.ts) écrit lignes_commande
-- avec le client de SESSION, jamais la service role — décision déjà prise pour
-- que ce soit RLS qui décide qui peut écrire (voir 0021 §4). Or `produits_maj_equipe`
-- (0002) réserve l'UPDATE sur produits_boutique à admin/editor : un client qui
-- vient de commander ne peut PAS toucher cette table lui-même, RLS le lui
-- refuserait. Un déclencheur SECURITY DEFINER — même schéma que handle_new_user
-- (0001) et interdire_auto_promotion (0019) — s'exécute avec les privilèges du
-- propriétaire de la fonction, pas de l'appelant : la décrémentation reste
-- possible sans ouvrir produits_boutique en écriture à n'importe quel client.
--
-- -----------------------------------------------------------------------------
-- POURQUOI LA RESTAURATION SE FAIT EN DEUX ENDROITS
-- -----------------------------------------------------------------------------
-- Une modification de commande (dans la fenêtre de 48h) supprime TOUTES les
-- lignes puis les réinsère (0021 §4 : « jamais un update ligne à ligne ») — le
-- DELETE restaure donc le stock de l'ancienne quantité, l'INSERT qui suit
-- décrémente la nouvelle. Une ANNULATION, elle, ne supprime jamais les lignes
-- (« annulee » est un statut, pas une suppression) : sans déclencheur séparé
-- sur `commandes`, le stock resterait décrémenté pour une commande qui n'aura
-- plus jamais lieu.
--
-- -----------------------------------------------------------------------------
-- FILET DE SÉCURITÉ, PAS UNE GARANTIE ABSOLUE CONTRE LA SURVENTE
-- -----------------------------------------------------------------------------
-- `greatest(0, quantite - ...)` empêche un nombre négatif si deux commandes
-- concurrentes visent le dernier exemplaire (creerCommande plafonne déjà sur
-- une lecture mise en cache, potentiellement légèrement périmée). Une
-- annulation ultérieure restaure la quantité PLEINE de la ligne, pas la part
-- réellement décrémentée : en cas de survente très rare, le stock affiché peut
-- remonter d'une unité de trop. Un compteur manuel reste la source de vérité —
-- c'est déjà le cas aujourd'hui, cette migration ne fait que le suivre plus
-- près de la réalité des ventes, pas le remplacer.
-- =============================================================================


-- =============================================================================
-- 1 · Statut suggéré — même règle que statutSuggere() (lib/stock.ts)
-- =============================================================================
--
-- `en_commande` et `en_livraison` sont des étiquettes fournisseur choisies à la
-- main (0013) : jamais écrasées ici, exactement comme côté TypeScript.

create or replace function public.statut_stock_suggere(statut_actuel text, nouvelle_quantite integer)
returns text
language sql
immutable
as $$
  select case
    when statut_actuel not in ('en_stock', 'rupture') then statut_actuel
    when nouvelle_quantite < 5 then 'rupture'
    else 'en_stock'
  end
$$;


-- =============================================================================
-- 2 · lignes_commande : décrémenter à l'ajout, restaurer au retrait
-- =============================================================================

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
    if old.produit_id is not null then
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

drop trigger if exists lignes_commande_ajuster_stock on public.lignes_commande;
create trigger lignes_commande_ajuster_stock
  after insert or delete on public.lignes_commande
  for each row execute function public.ajuster_stock_ligne_commande();


-- =============================================================================
-- 3 · commandes : restaurer le stock quand une commande passe à « annulee »
-- =============================================================================
--
-- Les lignes d'une commande annulée ne sont jamais supprimées (0021) : ce
-- déclencheur agit donc sur commandes, pas sur lignes_commande, et regroupe
-- par produit_id pour rester correct même si deux lignes visaient le même
-- produit dans la même commande.

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
      select produit_id, sum(quantite) as total
      from public.lignes_commande
      where commande_id = new.id and produit_id is not null
      group by produit_id
    ) agg
    where agg.produit_id = p.id;
  end if;
  return new;
end;
$$;

drop trigger if exists commandes_restaurer_stock_annulation on public.commandes;
create trigger commandes_restaurer_stock_annulation
  after update on public.commandes
  for each row execute function public.restaurer_stock_commande_annulee();


-- =============================================================================
-- 4 · Le commentaire de 0013 ne doit plus mentir
-- =============================================================================

comment on column public.produits_boutique.quantite is
  'Quantité en stock. Ajustée manuellement depuis /admin/catalogue, ET automatiquement '
  'par lignes_commande (trigger ajuster_stock_ligne_commande, 0023) à chaque commande '
  'créée, modifiée ou annulée — voir ce fichier pour le détail.';


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- 1. Décrémentation à la création — remplacer <produit> et <compte-existant>
--    par de vraies valeurs, nettoyer les deux lignes à la fin :
--
--      select quantite from public.produits_boutique where id = '<produit>';
--      -- noter N
--
--      insert into public.commandes (client_id, nom, email, mode_livraison)
--        values ('<compte-existant>', 'Test stock', 'audit+stock@ko-lab.test', 'ramassage')
--        returning id;
--      -- noter <commande>
--
--      insert into public.lignes_commande (commande_id, produit_id, nom_produit, categorie, quantite)
--        values ('<commande>', '<produit>', 'Test', 'Test', 2);
--
--      select quantite, statut_stock from public.produits_boutique where id = '<produit>';
--      -- attendu : N - 2, et 'rupture' si le résultat est < 5
--
-- 2. Restauration à l'annulation :
--
--      update public.commandes set statut = 'annulee' where id = '<commande>';
--      select quantite from public.produits_boutique where id = '<produit>';
--      -- attendu : de nouveau N
--
--      delete from public.lignes_commande where commande_id = '<commande>';
--      delete from public.commandes where id = '<commande>';
--
-- 3. `en_commande` / `en_livraison` jamais écrasés : mettre un produit à
--    'en_commande' à la main, répéter le test 1 — statut_stock doit rester
--    'en_commande' malgré la baisse de quantité.
-- =============================================================================
