-- =============================================================================
-- 0032 — Colonne photo_url sur postes_carrieres
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- ⚠️ NUMÉROTATION : le brief de ce chantier appelait ceci « migration 0033 »
-- et réservait « 0032 » au changement de gris clair froid (--ko-white,
-- #f8f6f1 → #e8e8e8). Ce dernier n'a rien à faire dans supabase/migrations/ —
-- c'est un changement de token CSS (src/styles/globals.css), aucun schéma de
-- base n'est concerné. Renumérotée ici pour combler l'écart plutôt que de
-- laisser un « 0032 » vide ou un fichier SQL sans contenu SQL.
--
-- Prépare une photo par offre d'emploi, affichée depuis /admin/carrieres —
-- l'écran d'édition arrive dans un prompt séparé. Nullable : un poste reste
-- publiable sans photo, exactement comme aujourd'hui. Les neuf postes
-- existants n'en reçoivent aucune ici.

alter table public.postes_carrieres
  add column if not exists photo_url text;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select id, titre_fr, photo_url from public.postes_carrieres order by ordre;
--   Attendu : 9 lignes, colonne photo_url présente, NULL partout.
-- =============================================================================
