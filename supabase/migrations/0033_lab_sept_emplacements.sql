-- =============================================================================
-- 0033 — Lab : les 5 photos orphelines rejoignent medias_emplacements
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- lab_1 et lab_2 existent déjà (migration 0031). Ce fichier ajoute les 5
-- emplacements manquants — PAS un ré-insert de lab_1/lab_2, `on conflict do
-- nothing` les laisserait de toute façon intacts s'ils étaient repris ici.
--
-- -----------------------------------------------------------------------------
-- LES 5 PHOTOS ONT ÉTÉ REGARDÉES AVANT CETTE MIGRATION
-- -----------------------------------------------------------------------------
-- Le brief le signalait explicitement : ces 5 fichiers du dossier lab/ n'ont
-- jamais été passés aux critères d'exclusion (aucune clé images.ts ne les
-- référençait, découvert le 22 août 2026 pendant la reconnaissance admin).
-- Vérifiées une par une avant d'écrire cette migration — pas seulement leur
-- code HTTP (200 confirmé pour les 5) :
--
--   lab-impression-3d-2026.webp  imprimante Bambu Lab (marque de l'appareil,
--                                pas un tiers) en cours d'impression
--   lab-petite-serie-2026.webp   plateau complet de petites pièces imprimées
--   lab-precision-2026.webp      main tenant une pièce de précision imprimée
--   lab-principale-2026.webp     pièce imprimée en forme de lettres/logo —
--                                ⚠️ SEULE RÉSERVE : forme ambiguë (illisible
--                                comme un nom de marque connu, aucune couleur
--                                ni contexte rattachable à un tiers identifié)
--                                — probablement un test de police/gabarit
--                                d'atelier, pas tranché avec certitude absolue,
--                                à confirmer par Christian en la voyant
--   lab-structure-2026.webp      maquette imprimée d'une structure de
--                                type échafaudage/triangulation
--
-- Aucune marque tierce dominante, aucun visage identifiable, aucun filigrane
-- sur les 5 — voir le rapport de la conversation du 22 août 2026 pour les
-- photos elles-mêmes.

insert into public.medias_emplacements (cle, url_stockage, alt_text_fr) values
  (
    'lab_3',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-impression-3d-2026.webp',
    'Imprimante 3D Bambu Lab en cours d''impression, pièce en cours de fabrication'
  ),
  (
    'lab_4',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-petite-serie-2026.webp',
    'Petite série de pièces imprimées en 3D, plateau complet'
  ),
  (
    'lab_5',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-precision-2026.webp',
    'Pièce imprimée en 3D de précision, tenue en main pour inspection'
  ),
  (
    'lab_6',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-principale-2026.webp',
    'Pièce imprimée en 3D, forme découpée sur le plateau de l''atelier'
  ),
  (
    'lab_7',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-structure-2026.webp',
    'Maquette imprimée en 3D d''une structure de type échafaudage'
  )
on conflict (cle) do nothing;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select cle, url_stockage from public.medias_emplacements
--   where cle like 'lab_%' order by cle;
--   Attendu : 7 lignes (lab_1..lab_7). Chaque URL doit répondre 200 — vérifié
--   avant l'écriture de ce fichier (HEAD sur les 5 nouvelles), à revérifier
--   après application comme pour 0031.
-- =============================================================================
