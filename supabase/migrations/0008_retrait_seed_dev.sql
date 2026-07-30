-- =============================================================================
-- 0008 — Retrait du contenu de démonstration
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA, APRÈS 0007. Lire les deux avertissements avant.
--
-- -----------------------------------------------------------------------------
-- CE QUI S'EST PASSÉ
-- -----------------------------------------------------------------------------
-- 0003_seed_dev.sql est un seed de DÉVELOPPEMENT. Il a été exécuté sur le
-- projet de production, et y a laissé du contenu inventé :
--
--   realisations       3 lignes  « Déploiement événementiel »,
--                                « Installation saisonnière »,
--                                « Fabrication sur mesure »
--   postes_carrieres   1 ligne   « Chef d'équipe terrain »
--   produits_boutique  2 lignes  corrigées par 0007, rien à faire ici
--
-- Constaté le 29 juillet 2026, en lisant l'API avec la CLÉ ANON — c'est-à-dire
-- exactement ce que voit n'importe quel visiteur : les trois politiques
-- `*_lecture_publique` de 0002 autorisent la lecture de toute ligne
-- `publie = true`, et ces lignes le sont.
--
-- Aucune de ces données n'apparaît sur le site AUJOURD'HUI : les pages
-- Réalisations et Carrières ont leur contenu en dur, la requête Supabase n'y
-- existe qu'en commentaire. Mais elles sont déjà interrogeables par l'API, et
-- elles s'afficheront le jour où ces pages seront branchées sur la base — ce
-- qui est prévu.
--
-- Un faux poste ouvert sur le site d'une vraie entreprise attire de vraies
-- candidatures. C'est celui des quatre qui compte.
--
-- -----------------------------------------------------------------------------
-- DÉPUBLIER PLUTÔT QUE SUPPRIMER
-- -----------------------------------------------------------------------------
-- `publie = false` les retire de toute lecture publique — la politique RLS ne
-- les renvoie plus — tout en les laissant visibles dans l'espace équipe. Si
-- l'une de ces lignes était finalement du vrai contenu saisi par Christian, il
-- suffit de la republier ; un DELETE, lui, ne se rattrape pas.
--
-- ⚠️ VÉRIFIER AVANT D'EXÉCUTER que ces titres sont bien ceux du seed et non du
-- contenu réel ajouté depuis :
--
--   select slug, titre_fr, publie, created_at from public.realisations order by created_at;
--   select slug, titre_fr, actif, created_at from public.postes_carrieres order by created_at;

update public.realisations
set publie = false
where slug in (
  'deploiement-evenementiel-2025',
  'installation-saisonniere-2025',
  'fabrication-sur-mesure-2025'
);

-- postes_carrieres utilise `actif`, pas `publie` — voir 0001.
update public.postes_carrieres
set actif = false
where slug = 'chef-equipe-terrain';

-- =============================================================================
-- VÉRIFICATION — refaire la lecture publique
-- =============================================================================
-- Depuis le dépôt, avec la clé ANON, donc dans les conditions d'un visiteur :
--
--   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/realisations?select=titre_fr" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
--   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/postes_carrieres?select=titre_fr" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
--
-- Attendu : deux tableaux vides. produits_boutique, lui, doit renvoyer les
-- douze produits de 0007.
--
-- =============================================================================
-- ET ENSUITE
-- =============================================================================
-- Ne plus exécuter 0003_seed_dev.sql sur ce projet. Son nom l'annonce, mais un
-- fichier rangé avec les autres migrations finit par être rejoué « pour être
-- sûr ». Le vrai contenu des réalisations et des postes se saisira depuis
-- l'espace équipe.
