-- =============================================================================
-- 0007 — Le catalogue passe en base
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- Les douze produits vivaient en dur dans src/lib/produits.ts. Ils entrent
-- dans produits_boutique, qui existait depuis 0001 et était restée vide.
--
-- Le contenu de ce fichier est GÉNÉRÉ depuis produits.ts et les fichiers de
-- traduction, pas recopié à la main : une divergence entre le code et le seed
-- serait restée invisible jusqu'à ce qu'un prix change d'un seul côté.
--
-- -----------------------------------------------------------------------------
-- DEUX COLONNES AJOUTÉES
-- -----------------------------------------------------------------------------
-- cadrage — comment l'image occupe son cadre carré. Les visuels fabricants
-- sont détourés sur blanc et restent entiers (contain) ; les photos de
-- conteneur sont prises dans une cour, avec ciel et sol, et remplissent le
-- cadre (cover). En contain elles s'afficheraient en bandes blanches.
--
-- couleurs — coloris disponibles, une photo par coloris. Vide partout : une
-- pastille annonce qu'une référence EXISTE et se commande. Inventer un
-- « noir » et un « blanc » pour meubler la fiche serait une fausse allégation
-- de disponibilité.

alter table public.produits_boutique
  add column if not exists cadrage text not null default 'contain'
    check (cadrage in ('contain', 'cover'));

alter table public.produits_boutique
  add column if not exists couleurs jsonb not null default '[]'::jsonb;

-- =============================================================================
-- LES DOUZE PRODUITS
-- =============================================================================
--
-- on conflict (slug) : ce fichier peut être rejoué sans créer de doublon. Il
-- met à jour le CONTENU, mais laisse publie et ordre intacts — sinon un rejeu
-- écraserait les décisions prises depuis l'espace d'administration, ce qui
-- est précisément ce qu'on veut éviter maintenant que le catalogue s'y règle.
--
-- ⚠️ PRIX PROVISOIRES : X1-Carbon, xTool P2 et xTool F1 n'ont jamais été
-- confirmés sur une source officielle (voir les commentaires de produits.ts).
-- Les verser en base ne les rend pas exacts.

insert into public.produits_boutique
  (slug, marque, categorie, nom_fr, nom_en, description_fr, description_en,
   prix, images, cadrage, publie, ordre)
values
  ('bambu-lab-x1-carbon', 'Bambu Lab', 'impression', 'Bambu Lab X1-Carbon', 'Bambu Lab X1-Carbon', 'Imprimante 3D fermée à haute vitesse, chambre chauffée et détection de fin de filament. Pour les pièces techniques et les petites séries.', 'Enclosed high-speed 3D printer with heated chamber and filament runout detection. For technical parts and short runs.', 1800.00, '["/images/produits/bambu-lab-x1-carbon.webp"]', 'contain', true, 10),
  ('bambu-lab-p1s', 'Bambu Lab', 'impression', 'Bambu Lab P1S', 'Bambu Lab P1S', 'Format identique au X1-Carbon, électronique simplifiée. Le bon compromis pour un premier atelier d''impression.', 'Same footprint as the X1-Carbon with simplified electronics. The right trade-off for a first printing setup.', 899.00, '["/images/produits/bambu-lab-p1s-v2.webp"]', 'contain', true, 20),
  ('bambu-lab-ams', 'Bambu Lab', 'impression', 'Bambu Lab AMS', 'Bambu Lab AMS', 'Système multi-matériaux quatre bobines, avec gestion automatique de l''humidité.', 'Four-spool multi-material system with automatic humidity management.', 449.00, '["/images/produits/bambu-lab-ams.webp"]', 'contain', true, 30),
  ('xtool-p2', 'xTool', 'laser', 'xTool P2', 'xTool P2', 'Découpe et gravure laser CO2 55 W, grand format. Pour la signalétique, les gabarits et les décors.', 'Large-format 55 W CO2 laser cutter and engraver. For signage, jigs and sets.', 5000.00, '["/images/produits/xtool-p2-v2.webp"]', 'contain', true, 40),
  ('xtool-s1', 'xTool', 'laser', 'xTool S1', 'xTool S1', 'Laser diode fermé, découpe de précision sur bois, acrylique et cuir.', 'Enclosed diode laser, precision cutting on wood, acrylic and leather.', 3399.00, '["/images/produits/xtool-s1-v2.webp"]', 'contain', true, 50),
  ('xtool-f1', 'xTool', 'laser', 'xTool F1', 'xTool F1', 'Graveur portatif fibre et diode, pour le marquage de pièces métalliques.', 'Portable fibre and diode engraver, for marking metal parts.', 1100.00, '["/images/produits/xtool-f1-v2.webp"]', 'contain', true, 60),
  ('eclairage-temporaire', 'KO-LAB', 'equipements', 'Éclairage temporaire de chantier', 'Temporary site lighting', 'Mâts et projecteurs pour le travail de nuit, avec distribution électrique.', 'Masts and floodlights for overnight work, with power distribution.', 450.00, '["/images/produits/eclairage-temporaire.webp"]', 'contain', true, 70),
  ('equipement-manutention', 'KO-LAB', 'equipements', 'Équipement de manutention', 'Material handling equipment', 'Transpalettes, diables et sangles pour le chargement et le déplacement.', 'Pallet trucks, dollies and straps for loading and moving.', 350.00, '["/images/produits/equipement-manutention.webp"]', 'contain', true, 80),
  ('outillage-installation', 'KO-LAB', 'equipements', 'Outillage d''installation', 'Installation tooling', 'Visserie, fixations et outils portatifs pour le montage sur site.', 'Fasteners, fixings and portable tools for on-site assembly.', 250.00, '["/images/produits/outillage-installation.webp"]', 'contain', true, 90),
  ('conteneur-20-pieds', 'KO-LAB', 'conteneurs', 'Conteneur 20 pieds standard', '20-foot standard container', 'Entreposage sécurisé, atelier de chantier ou bureau temporaire. Livré et positionné.', 'Secure storage, site workshop or temporary office. Delivered and positioned.', 3500.00, '["/images/produits/conteneur-20-pieds.webp"]', 'cover', true, 100),
  ('conteneur-40-pieds-high-cube', 'KO-LAB', 'conteneurs', 'Conteneur 40 pieds high cube', '40-foot high cube container', 'Volume et hauteur accrus, pour le stockage de structures et de matériel encombrant.', 'Extra volume and height, for storing structures and bulky equipment.', 5800.00, '["/images/produits/conteneur-40-pieds-high-cube.webp"]', 'cover', true, 110),
  ('conteneur-bureau-amenage', 'KO-LAB', 'conteneurs', 'Conteneur bureau aménagé', 'Fitted office container', 'Livré clé en main : fenêtres, électricité, isolation. Prêt à occuper dès la pose.', 'Delivered turnkey: windows, power, insulation. Ready to occupy on placement.', 8200.00, '["/images/produits/conteneur-bureau-amenage.webp"]', 'cover', true, 120)
on conflict (slug) do update set
  marque         = excluded.marque,
  categorie      = excluded.categorie,
  nom_fr         = excluded.nom_fr,
  nom_en         = excluded.nom_en,
  description_fr = excluded.description_fr,
  description_en = excluded.description_en,
  prix           = excluded.prix,
  images         = excluded.images,
  cadrage        = excluded.cadrage;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select categorie, count(*), count(prix) as avec_prix
--   from public.produits_boutique group by categorie order by categorie;
--
-- Attendu : conteneurs 3, equipements 3, impression 3, laser 3, tous avec prix.
--
--   select count(*) from public.produits_boutique where publie;
--
-- Attendu : 12.
