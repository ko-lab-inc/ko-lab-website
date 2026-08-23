-- Un emplacement média peut exister sans photo — retrait volontaire depuis
-- /admin/medias-emplacements ("Retirer la photo"), plutôt que de forcer un
-- remplacement immédiat. Aucune ligne existante n'a besoin d'être modifiée :
-- toutes ont aujourd'hui une url_stockage réelle.
--
-- resoudreEmplacement (src/lib/medias-emplacements.ts) distingue désormais
-- une ligne PRÉSENTE avec url_stockage NULL (choix délibéré, aucun repli)
-- d'une ligne ABSENTE (repli sur medias-repli.ts, inchangé).

alter table public.medias_emplacements alter column url_stockage drop not null;
