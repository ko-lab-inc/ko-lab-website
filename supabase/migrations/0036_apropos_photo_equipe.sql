-- Photo d'équipe de la page À propos — route A (medias_emplacements, 0031).
--
-- Numérotée 0036 : 0034 et 0035 n'ont jamais existé comme fichiers ici — la
-- première désignait une architecture medias_emplacements pour les photos de
-- postes carrières, abandonnée au profit de postes_carrieres.photo_url seul
-- (voir 0032) ; la seconde était le changement de couleur --ko-white
-- (#fafafa), un token CSS pur sans rien à faire dans supabase/migrations/.
--
-- Photo vérifiée manuellement (deuxième regard, en plus de la validation de
-- Moussa) contre les critères de docs/audits/ avant tout téléversement :
-- aucun logo tiers dominant, aucun nom lisible, aucun filigrane. Une seconde
-- photo candidate (équipe caméra posant devant un écran affichant les logos
-- HBO/Netflix/Fool Us) a été écartée pour cette raison — voir
-- docs/audits/2026-08-22-photo-equipe-hbo-netflix-foolus.md.

insert into public.medias_emplacements (cle, url_stockage, alt_text_fr, alt_text_en)
values (
  'apropos_1',
  'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/equipe/equipe-kolab-2024.webp',
  'Six membres de l''équipe KO-LAB posant ensemble lors d''un événement, en tenue de soirée.',
  null
)
on conflict (cle) do nothing;
