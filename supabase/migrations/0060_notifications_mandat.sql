-- =============================================================================
-- 0060 — destinataire supplémentaire pour les demandes de mandat (design/fabrication)
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente — `on conflict (cle) do nothing`. NON destructive.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE
-- -----------------------------------------------------------------------------
-- Demandé par Martin (3d@ko-lab.ca) le 26 octobre 2026 : recevoir lui-même les
-- demandes de type « mandat » (le formulaire de contact les affiche sous
-- « Démarrer un mandat » — ce sont les projets de design/fabrication), EN PLUS
-- de qui les reçoit déjà via `notifications_demandes` (0053).
--
-- ⚠️ CE N'EST PAS UN REMPLACEMENT DE `notifications_demandes`
--
-- `notifications_demandes` reste le destinataire de TOUTES les demandes
-- (mandat, location, boutique, carrière, autre) — rien n'y change.
-- `notifications_mandat` s'Y AJOUTE, mais SEULEMENT quand `type = 'mandat'`
-- (voir lib/destinataires.ts et api/contact/route.ts). Une adresse présente
-- dans les deux listes à la fois ne reçoit qu'UN SEUL courriel (dédoublonnage
-- à l'envoi), pas deux.
--
-- VIDE PAR DÉFAUT, comme les deux listes de 0053 : tant que ce champ n'est pas
-- rempli dans /admin/reglages, le comportement est EXACTEMENT celui d'avant
-- cette migration — aucun destinataire supplémentaire.

insert into public.reglages (cle, valeur, description, publique) values
  (
    'notifications_mandat',
    '',
    'Qui reçoit EN PLUS les notifications de nouvelle demande de type "mandat" (projets de design/fabrication, formulaire "Démarrer un mandat"). Plusieurs adresses séparées par des virgules. Vide = personne de plus (seul notifications_demandes reçoit). N''est PAS affichée au public.',
    false
  )
on conflict (cle) do nothing;

-- =============================================================================
-- VÉRIFICATION APRÈS EXÉCUTION
-- =============================================================================
-- 1) La clé existe, vide, non publique :
--    select cle, valeur, publique from public.reglages where cle = 'notifications_mandat';
--
-- 2) Le total (doit renvoyer 25, soit 24 + cette clé) :
--    select count(*) from public.reglages;
