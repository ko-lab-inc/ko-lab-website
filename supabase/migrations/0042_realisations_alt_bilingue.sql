-- =============================================================================
-- 0042 — Alt bilingue par photo, realisations.images
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — voir la clause WHERE EXISTS plus bas.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE
-- -----------------------------------------------------------------------------
-- Audit bilingue du 23 août 2026 : chaque entrée de la colonne jsonb
-- `realisations.images` ne portait qu'un seul texte alternatif (`alt`),
-- affiché tel quel dans les deux langues — alors que `concours_photos`
-- (migration 0040) porte déjà `alt_fr`/`alt_en` par photo. Cette migration
-- convertit `images` à la même forme : `{ url, alt_fr, alt_en, ordre }`.
--
-- Aucune colonne ajoutée : `images` reste un jsonb, seule sa FORME change.
-- Rien à faire côté GRANT/RLS — la politique porte sur la table, pas sur la
-- structure interne d'une colonne jsonb.
--
-- -----------------------------------------------------------------------------
-- CONVERSION : `alt` DEVIENT `alt_fr`, `alt_en` NAÎT À `null`
-- -----------------------------------------------------------------------------
-- Aucune entrée existante n'a jamais eu de traduction anglaise à cet
-- endroit — lui en inventer une serait un mensonge, pas une conversion.
-- `alt_en: null` est donc la seule valeur honnête de départ ; le repli FR du
-- code applicatif (lib/realisations.ts) s'applique déjà à `null`.
--
-- -----------------------------------------------------------------------------
-- IDEMPOTENTE : UNE ENTRÉE AVEC `alt_en` (MÊME `null`) N'EST PLUS TOUCHÉE
-- -----------------------------------------------------------------------------
-- Rejouer cette migration après qu'une entrée a déjà été convertie — ou
-- après qu'un admin a rempli un vrai `alt_en` depuis le nouveau formulaire —
-- ne doit PAS écraser ce travail par un nouveau `null`. La présence de la
-- clé `alt_en` (peu importe sa valeur) marque une entrée comme déjà à jour ;
-- seules les entrées qui ne l'ont pas encore sont reconstruites.
--
-- `alt_fr` reprend `alt_fr` s'il existe déjà (lignes antérieures à la
-- migration 0014, qui portaient encore cette clé selon lib/realisations.ts),
-- sinon l'ancien `alt` tel quel, sinon une chaîne vide.
-- =============================================================================

update public.realisations
set images = (
  select coalesce(
    jsonb_agg(
      case
        when elem ? 'alt_en' then elem
        else jsonb_build_object(
          'url', elem->'url',
          'alt_fr', coalesce(elem->'alt_fr', elem->'alt', to_jsonb(''::text)),
          'alt_en', 'null'::jsonb,
          'ordre', coalesce(elem->'ordre', to_jsonb(0))
        )
      end
      order by coalesce(elem->'ordre', to_jsonb(0))
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(images) as elem
)
where images is not null
  and jsonb_typeof(images) = 'array'
  and exists (
    select 1 from jsonb_array_elements(images) as e2 where not (e2 ? 'alt_en')
  );

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select id, slug, images
--   from public.realisations
--   where images is not null and jsonb_array_length(images) > 0
--   limit 20;
--   -- attendu : chaque élément de chaque tableau porte url, alt_fr, alt_en,
--   -- ordre — plus jamais un simple `alt`.
--
--   -- Doit renvoyer 0 ligne (plus aucune entrée non convertie) :
--   select count(*) from public.realisations, jsonb_array_elements(images) as e
--   where not (e ? 'alt_en');
-- =============================================================================
