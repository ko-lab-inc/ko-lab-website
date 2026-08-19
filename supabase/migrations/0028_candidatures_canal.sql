-- =============================================================================
-- 0028 — Traçabilité du canal de candidature (interne vs Google Form)
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- -----------------------------------------------------------------------------
-- POURQUOI CE N'EST PAS LA COLONNE `source` EXISTANTE
-- -----------------------------------------------------------------------------
-- `candidatures.source` (0017) répond à « Comment avez-vous entendu parler de
-- KO-LAB ? » (réseaux sociaux / bouche-à-oreille / site web / autre) — une
-- question posée AU CANDIDAT, sur son propre parcours. Le besoin de la
-- Phase 6.2 est différent : savoir par QUEL FORMULAIRE la candidature est
-- arrivée, pour arbitrer plus tard entre le canal interne et le Google Form
-- externe (LIEN_CANDIDATURE_EXTERNE, constantes.ts). Réutiliser `source`
-- confondrait les deux réponses — un candidat qui répond « Site web KO-LAB »
-- à la question marketing ne dit rien sur le formulaire qu'il a rempli.
--
-- -----------------------------------------------------------------------------
-- POURQUOI UNE SEULE VALEUR POSSIBLE AUJOURD'HUI
-- -----------------------------------------------------------------------------
-- Cette table ne reçoit QUE les dépôts du formulaire interne
-- (/carrieres/postuler, action envoyerCandidature) : le Google Form externe
-- est un produit Google, ses réponses vivent dans Google Sheets, jamais dans
-- cette base. `canal` vaut donc 'interne' pour CHAQUE ligne existante et
-- future de cette table — la comparaison des deux canaux se fait en mettant
-- en regard `count(*) from candidatures` et le compte de réponses du Google
-- Form, pas par une requête unique. La colonne existe quand même : sans elle,
-- rien ne distingue une candidature « le canal interne a bien été utilisé »
-- d'une candidature dont on ignore l'origine si un jour une autre source
-- écrit dans cette même table.

alter table public.candidatures
  add column if not exists canal text not null default 'interne'
  check (canal in ('interne'));

comment on column public.candidatures.canal is
  'Formulaire par lequel la candidature est arrivée. Une seule valeur possible aujourd''hui (interne) : le Google Form externe n''écrit jamais dans cette table — voir Phase 6.2.';

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select canal, count(*) from public.candidatures group by canal;
--   -- Attendu : une seule ligne, canal = 'interne'.
-- =============================================================================
