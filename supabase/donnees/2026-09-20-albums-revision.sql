-- =============================================================================
-- Albums de réalisations de la révision du 20 septembre 2026 (§14, §15, §17)
-- =============================================================================
--
-- ⚠️ DONNÉES, pas schéma : à exécuter par Moussa dans le SQL editor Supabase,
-- projet ko-lab-site. Idempotent — chaque INSERT est gardé par un
-- WHERE NOT EXISTS sur le slug, rejouer ne crée jamais de doublon.
--
-- Ce que ça crée : onze albums SANS PHOTO (images = []) et NON PUBLIÉS
-- (publie = false). Joe ajoute les photos et publie depuis
-- /admin/realisations, album par album, à son goût. Rappel de la règle du
-- site : un album sans photo n'apparaît jamais au public, même publié
-- (lireRealisationsPubliees écarte toute réalisation sans image).
--
-- Trois groupes, d'après le brief :
--   A. Fiches projets majeures (§14.1) — fiche = true, page dédiée.
--   B. Albums de galerie KO-LAB (§14.2, §17).
--   C. Expérience passée (§15) — origine = 'experience_passee', jamais
--      présentés comme des réalisations KO-LAB ; le site affiche le libellé.
--
-- Pas créés, volontairement :
--   - FSG (§17 : « banque visuelle seulement, sans rattacher fortement le
--     projet à KO-LAB ») — un album public l'y rattacherait.
--   - Décors Olivier Saadah, Lumini-1-001 (§16 : « ne pas utiliser »).
--   - Terrasse LPG / AVA / La Recharge sous son nom (§16) : créée sous un
--     titre anonyme, voir « Aménagement d'une terrasse » plus bas.
--   - Canada Day 2025, DevFest, Décor des Fêtes, Enseignes, Le LAB : ils
--     existent déjà.
--
-- Rien n'est inventé : titres, descriptions et tags reprennent le brief.
-- Tout reste modifiable dans l'admin (catégorie, textes, tags, ordre).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A. FICHES PROJETS MAJEURES (§14.1) — fiche = true
-- ---------------------------------------------------------------------------

insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'cinq23-devcore',
  'Cinq23 — Devcore',
  'Cinq23 — Devcore',
  'Signalisation architecturale d''un projet immobilier : relevés sur place, design, production en série, identification et installation. Projet en cours — la fiche évolue avec le mandat.',
  'Architectural signage for a real-estate project: on-site surveys, design, production runs, identification and installation. Ongoing project — this entry grows with the mandate.',
  'lab',
  array['Relevés sur place', 'Design', 'Signalisation', 'Production en série', 'Identification', 'Installation'],
  '[]'::jsonb,
  false,
  5,
  true,
  'kolab'
where not exists (select 1 from public.realisations where slug = 'cinq23-devcore');

insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'cityfolk-legacy-walk-phase-1',
  'CityFolk — Legacy Walk, phase 1',
  'CityFolk — Legacy Walk, Phase 1',
  'Concept, design, fabrication, impression et installation des visuels et des structures du parcours. Phase 1.',
  'Concept, design, fabrication, printing and installation of the walk''s visuals and structures. Phase 1.',
  'lab',
  array['Concept', 'Design', 'Fabrication', 'Impression', 'Installation'],
  '[]'::jsonb,
  false,
  6,
  true,
  'kolab'
where not exists (select 1 from public.realisations where slug = 'cityfolk-legacy-walk-phase-1');

-- 1Valet — « rôle final encore à confirmer : langage prudent et extensible »
-- (§14.1). Aucun rôle précis n'est affirmé.
insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  '1valet-deploiement-de-marque',
  '1Valet — déploiement de marque',
  '1Valet — Brand deployment',
  'Soutien au déploiement de marque et aux événements de 1Valet, au Canada, aux États-Unis et à l''international. Projet en cours — le périmètre se précise avec le mandat.',
  'Support for 1Valet''s brand deployments and events in Canada, the United States and internationally. Ongoing project — the scope takes shape with the mandate.',
  'equipement',
  array['Déploiement', 'Événementiel', 'Branding'],
  '[]'::jsonb,
  false,
  7,
  true,
  'kolab'
where not exists (select 1 from public.realisations where slug = '1valet-deploiement-de-marque');

-- ---------------------------------------------------------------------------
-- B. ALBUMS DE GALERIE KO-LAB (§14.2, §17) — fiche = false
-- ---------------------------------------------------------------------------

-- Suite9 : « peut devenir une fiche si les photos et l'histoire finale sont
-- assez fortes » (§14.1) — créé en galerie, Joe coche « fiche » s'il le veut.
insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'suite9-amenagement-commercial',
  'Suite9 — aménagement commercial',
  'Suite9 — Commercial fit-out',
  'Murales, étagères, cabines d''essayage et autres éléments d''un aménagement commercial.',
  'Murals, shelving, fitting rooms and other elements of a commercial fit-out.',
  'installation',
  array['Murales', 'Étagères', 'Cabines d''essayage'],
  '[]'::jsonb,
  false,
  35,
  false,
  'kolab'
where not exists (select 1 from public.realisations where slug = 'suite9-amenagement-commercial');

-- Créations bois / pièces sur mesure (§17 : rennes, plaques bois, urne,
-- table pique-nique, objets) — titre public sans l'ancien nom de marque.
insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'creations-bois-sur-mesure',
  'Créations bois sur mesure',
  'Custom wood creations',
  'Rennes, plaques, urne, mobilier et objets : pièces uniques fabriquées au LAB.',
  'Reindeer, plaques, urn, furniture and objects: one-off pieces made at The LAB.',
  'lab',
  array[]::text[],
  '[]'::jsonb,
  false,
  25,
  false,
  'kolab'
where not exists (select 1 from public.realisations where slug = 'creations-bois-sur-mesure');

-- Terrasse (§16 : « interdiction d'identifier le client ou le projet ») —
-- titre et texte volontairement anonymes ; 1 ou 2 photos sans élément
-- identifiable, à choisir par Joe.
insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'amenagement-d-une-terrasse',
  'Aménagement d''une terrasse',
  'Patio fit-out',
  'Décor et aménagement d''une terrasse commerciale.',
  'Décor and fit-out of a commercial patio.',
  'installation',
  array[]::text[],
  '[]'::jsonb,
  false,
  36,
  false,
  'kolab'
where not exists (select 1 from public.realisations where slug = 'amenagement-d-une-terrasse');

-- ---------------------------------------------------------------------------
-- C. EXPÉRIENCE PASSÉE (§15) — origine = 'experience_passee', fiche = false
--    « Quelques photos seulement », pas de fiche détaillée.
-- ---------------------------------------------------------------------------

insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'one-alex-au-pays-des-merveilles',
  'ONE — Alex au pays des merveilles',
  'ONE — Alex in Wonderland',
  'Production et décor d''un événement immersif.',
  'Production and décor of an immersive event.',
  'installation',
  array[]::text[],
  '[]'::jsonb,
  false,
  70,
  false,
  'experience_passee'
where not exists (select 1 from public.realisations where slug = 'one-alex-au-pays-des-merveilles');

insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'fleur-d-azur',
  'Fleur d''Azur',
  'Fleur d''Azur',
  'Ambiance, décors et créations dans des lieux atypiques.',
  'Atmosphere, décor and creations in unconventional venues.',
  'installation',
  array[]::text[],
  '[]'::jsonb,
  false,
  71,
  false,
  'experience_passee'
where not exists (select 1 from public.realisations where slug = 'fleur-d-azur');

-- Florida Water Market (§15 : « montrer l'ampleur de production, sans
-- raconter l'historique financier »).
insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'florida-water-market',
  'Florida Water Market',
  'Florida Water Market',
  'Grande production : ambiance, scène et décor.',
  'Large-scale production: atmosphere, stage and décor.',
  'installation',
  array[]::text[],
  '[]'::jsonb,
  false,
  72,
  false,
  'experience_passee'
where not exists (select 1 from public.realisations where slug = 'florida-water-market');

-- HAP 2023 (§15 : « éviter tout élément reconnaissable ou wording lié à une
-- franchise protégée ») — aucun nom de franchise, ni ici ni dans les tags.
insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'hap-2023',
  'HAP 2023',
  'HAP 2023',
  'Décor immersif, chandelles et spectacle.',
  'Immersive décor, candles and show.',
  'installation',
  array[]::text[],
  '[]'::jsonb,
  false,
  73,
  false,
  'experience_passee'
where not exists (select 1 from public.realisations where slug = 'hap-2023');

insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, images, publie, ordre, fiche, origine)
select
  'unigym-championnat',
  'Unigym — Championnat',
  'Unigym — Championship',
  'Plateau, production et décors.',
  'Set, production and décor.',
  'installation',
  array[]::text[],
  '[]'::jsonb,
  false,
  74,
  false,
  'experience_passee'
where not exists (select 1 from public.realisations where slug = 'unigym-championnat');

-- ---------------------------------------------------------------------------
-- Vérification après exécution — attendu : 11 lignes, toutes publie = false,
-- 0 photo, 3 fiches, 5 en expérience passée.
-- ---------------------------------------------------------------------------
-- select slug, categorie, fiche, origine, publie, jsonb_array_length(images) as photos, ordre
-- from public.realisations
-- where slug in ('cinq23-devcore', 'cityfolk-legacy-walk-phase-1', '1valet-deploiement-de-marque',
--   'suite9-amenagement-commercial', 'creations-bois-sur-mesure', 'amenagement-d-une-terrasse',
--   'one-alex-au-pays-des-merveilles', 'fleur-d-azur', 'florida-water-market', 'hap-2023', 'unigym-championnat')
-- order by ordre;
