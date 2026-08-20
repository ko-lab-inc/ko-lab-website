-- =============================================================================
-- 0029 — Réglage boutique_active
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- -----------------------------------------------------------------------------
-- POURQUOI CETTE CLÉ, DISTINCTE DE panier_actif
-- -----------------------------------------------------------------------------
-- panier_actif (0011) ne retire que le mécanisme panier/commande — la
-- boutique reste visible et parcourable, avec un repli « demander un prix »
-- par produit. Ce n'est pas la même chose que « désactiver la boutique » :
-- Christian a demandé de pouvoir la retirer entièrement (navigation, section
-- d'accueil, routes, sitemap, robots) sans passer par panier_actif, qui
-- garderait ce mode de repli intentionnel. Deux drapeaux, deux portées.
--
-- -----------------------------------------------------------------------------
-- VALEUR DE DÉPART : true
-- -----------------------------------------------------------------------------
-- Même règle que 0011 : cette migration ne doit rien changer de visible tant
-- que personne ne décoche la case dans /admin/reglages. `on conflict do
-- nothing` : rejouer le fichier ne doit pas écraser une valeur déjà ajustée.

insert into public.reglages (cle, valeur, description, publique) values
  (
    'boutique_active',
    'true',
    'Boutique en ligne. false la retire de la navigation, de la section accueil, du sitemap, de robots.txt, et rend ses routes introuvables (404) — distinct de panier_actif, qui laisse la boutique visible sans panier.',
    true
  )
on conflict (cle) do nothing;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select cle, valeur, publique from public.reglages where cle = 'boutique_active';
--
-- Attendu : une ligne, valeur 'true', publique = true.
