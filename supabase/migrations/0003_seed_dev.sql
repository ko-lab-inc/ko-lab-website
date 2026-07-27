-- =============================================================================
-- KO-LAB — 0003 : données de test (DÉVELOPPEMENT)
-- =============================================================================
-- À exécuter APRÈS 0002. Résultat attendu : « Success. No rows returned ».
--
-- ⚠️ NE PAS EXÉCUTER EN PRODUCTION. Ces lignes existent pour valider les
-- requêtes, les filtres et les politiques RLS avant l'arrivée du vrai contenu.
--
-- Textes repris du document de cadrage KO-LAB, pour que le rendu ressemble au
-- site final plutôt qu'à du lorem ipsum.
--
-- `on conflict (slug) do nothing` : la migration est rejouable sans doublon
-- ni erreur si elle est lancée deux fois.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3 réalisations — une par catégorie utilisée sur l'accueil
-- -----------------------------------------------------------------------------
insert into public.realisations
  (slug, titre_fr, titre_en, description_fr, description_en, categorie, tags, publie, ordre)
values
  (
    'deploiement-evenementiel-2025',
    'Déploiement événementiel',
    'Event deployment',
    'Coordination d''équipes sur plusieurs zones, montage, soutien pendant l''événement et démontage.',
    'Crew coordination across multiple zones, setup, on-site support during the event and teardown.',
    'terrain',
    array['evenement', 'multisite', 'nuit'],
    true,
    1
  ),
  (
    'installation-saisonniere-2025',
    'Installation saisonnière',
    'Seasonal installation',
    'Préparation, transport, installation en hauteur, suivi et retrait — jusqu''à l''entreposage.',
    'Preparation, transport, work at height, monitoring and removal — through to storage.',
    'installation',
    array['decor', 'commercial', 'hauteur'],
    true,
    2
  ),
  (
    'fabrication-sur-mesure-2025',
    'Fabrication sur mesure',
    'Custom fabrication',
    'Conception, prototypage et production de pièces développées pour les besoins réels du projet.',
    'Design, prototyping and production of parts developed for the project''s real needs.',
    'lab',
    array['impression-3d', 'prototypage', 'cnc'],
    true,
    3
  )
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- 2 produits boutique — un par marque
-- -----------------------------------------------------------------------------
-- `prix` laissé à NULL : c'est la valeur qui signifie « sur demande » (skill 03),
-- et c'est le mode de fonctionnement de la phase 1 (skill 21).
insert into public.produits_boutique
  (slug, marque, categorie, nom_fr, nom_en, description_fr, description_en,
   prix, specs, url_externe, publie, ordre)
values
  (
    'bambu-lab-x1-carbon',
    'Bambu Lab',
    'impression-3d',
    'Bambu Lab X1-Carbon',
    'Bambu Lab X1-Carbon',
    'Imprimante 3D fermée à haute vitesse, chambre chauffée et détection de fin de filament. Pour les pièces techniques et les petites séries.',
    'Enclosed high-speed 3D printer with heated chamber and filament runout detection. For technical parts and short runs.',
    null,
    '{"volume": "256 x 256 x 256 mm", "buse": "0.4 mm", "chambre": "chauffée"}'::jsonb,
    'https://bambulab.com',
    true,
    1
  ),
  (
    'xtool-p2',
    'xTool',
    'laser',
    'xTool P2',
    'xTool P2',
    'Découpe et gravure laser CO2 55 W, grand format. Pour la signalétique, les gabarits et les décors.',
    'Large-format 55 W CO2 laser cutter and engraver. For signage, jigs and sets.',
    null,
    '{"puissance": "55 W", "surface": "600 x 308 mm", "type": "CO2"}'::jsonb,
    'https://xtool.com',
    true,
    2
  )
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- 1 poste carrière
-- -----------------------------------------------------------------------------
-- Pas de contrainte d'unicité sur cette table : le `not exists` évite le
-- doublon si la migration est rejouée.
insert into public.postes_carrieres
  (titre_fr, titre_en, departement, type,
   description_fr, description_en, exigences_fr, exigences_en, actif, ordre)
select
  'Chef d''équipe terrain',
  'Field Team Lead',
  'Opérations',
  'temps-plein',
  'Encadrement d''une équipe sur le terrain, du montage au démontage. Répartition des tâches, contrôle de la qualité et liaison avec le superviseur.',
  'Leading a crew in the field, from setup to teardown. Task assignment, quality control and liaison with the supervisor.',
  E'Expérience de montage, installation ou événementiel\nCapacité à diriger une équipe sous pression\nDisponibilité pour des horaires variables\nBonne condition physique',
  E'Experience in setup, installation or events\nAble to lead a crew under pressure\nAvailable for variable schedules\nGood physical condition',
  true,
  1
where not exists (
  select 1 from public.postes_carrieres where titre_fr = 'Chef d''équipe terrain'
);

-- =============================================================================
-- Vérification — à exécuter séparément pour contrôler le résultat
-- =============================================================================
-- select 'realisations' as table_, count(*) from public.realisations
-- union all select 'produits', count(*) from public.produits_boutique
-- union all select 'postes',   count(*) from public.postes_carrieres;
--
-- Attendu : realisations 3, produits 2, postes 1.
--
-- Contrôle du RLS (skill 25) — aucune table ne doit apparaître sans politique :
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select tablename, policyname, cmd from pg_policies where schemaname = 'public'
--   order by tablename;
