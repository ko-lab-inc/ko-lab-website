-- =============================================================================
-- 0031 — Table medias_emplacements (architecture média, route A)
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- Neuf emplacements fixes de sections, URL remplaçable depuis un futur écran
-- admin (prompt suivant), repli sur `src/lib/images.ts` si la clé manque en
-- base. Métadonnées minimales : URL + alt text. Les dimensions restent au CSS
-- du conteneur (`fill` + `sizes`, patron déjà utilisé partout sur le site —
-- voir la reconnaissance du 22 août 2026).
--
-- -----------------------------------------------------------------------------
-- CORRECTIONS APPORTÉES AU BRIEF, ET POURQUOI
-- -----------------------------------------------------------------------------
-- Quatre des neuf clés `IMAGES.*` citées dans le brief n'existaient pas telles
-- quelles — vérifié contre `src/lib/images.ts` avant d'écrire une seule ligne
-- de cette migration :
--
--   IMAGES.besoinCreer            n'existe pas — il n'y a pas de 4ᵉ besoin
--                                  « Créer ». Besoins.tsx a exactement quatre
--                                  cartes : Déployer, Installer, Fabriquer,
--                                  Louer. besoin_1..4 sont réalignés sur cet
--                                  ordre réel, avec la photo que chaque carte
--                                  affiche AUJOURD'HUI (« fabriquer » utilise
--                                  besoinFabriquerKiosque2025 depuis le
--                                  20 août 2026, pas besoinFabriquer — celle-ci
--                                  sert désormais la section LAB de l'accueil).
--   IMAGES.labMachine2026          n'existe pas — clé réelle : labImpression3d
--   IMAGES.labPrecisionCablage2024 n'existe pas — clé réelle : precisionCablage2024
--   IMAGES.operationsCrew2026      n'existe pas — clé réelle : operationsCrew
--
-- Un cinquième point n'était pas une faute de frappe : IMAGES.deploiementCamion
-- existe, mais porte des logos tiers dominants (Gatorade, Eska) et a été
-- retirée du site le 20 août 2026 pour cette raison précise — la reproposer
-- ici aurait recréé le problème dans un nouvel emplacement public.
--
-- L'alternative proposée en remplacement, IMAGES.transportRemorque2026, a été
-- REGARDÉE avant d'être retenue (pas seulement choisie parce qu'« aucun
-- commentaire ne la signalait ») — elle montre en réalité une nacelle de
-- location avec l'enseigne « LOCATION GM » et un numéro de téléphone
-- parfaitement lisibles, plus une enseigne Banque Scotia en arrière-plan :
-- même catégorie de défaut, pas une correction. IMAGES.deploiementRemorque,
-- vérifiée à son tour, ne montre qu'un badge de calandre Volvo (marque du
-- véhicule, incidente, ne suggère aucune relation d'affaires — même
-- raisonnement que le badge GMC ou Volvo sur n'importe quel camion de
-- chantier) et « STAGE DOOR », une étiquette opérationnelle de KO-LAB
-- elle-même. C'est celle-ci qui alimente `deployment_camion`.
--
-- Les neuf photos retenues ont TOUTES été ouvertes et inspectées
-- individuellement avant cette migration (pas seulement les clés qui posaient
-- déjà un problème connu) — voir le rapport de la conversation pour le détail
-- par photo. Aucune autre n'a montré de marque tierce dominante, de visage
-- identifiable au premier plan, ou de filigrane.
-- =============================================================================


-- =============================================================================
-- TABLE
-- =============================================================================

create table if not exists public.medias_emplacements (
  id            uuid primary key default gen_random_uuid(),
  cle           text unique not null,
  url_stockage  text not null,
  alt_text_fr   text not null,
  -- NULL jusqu'à ce que Phase 9 (bilingue) fournisse une traduction — repli
  -- sur alt_text_fr côté lecture (medias-emplacements.ts), même patron que
  -- lib/carrieres.ts pour titre_en/description_en.
  alt_text_en   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Réutilise touch_updated_at(), déjà en place depuis 0001 (posé sur
-- `realisations`) — pas de nouvelle fonction pour un besoin identique.
drop trigger if exists set_updated_at on public.medias_emplacements;
create trigger set_updated_at
  before update on public.medias_emplacements
  for each row execute function public.touch_updated_at();


-- =============================================================================
-- RLS
-- =============================================================================

alter table public.medias_emplacements enable row level security;

-- ⚠️ `using (true)` sur un SELECT — à première vue, ça contredit la cible
-- « Policies using(true) sur SELECT/UPDATE/DELETE : 0 » de CLAUDE.md. Ce
-- n'est pas un oubli : cette cible existe parce que, sur CE projet, chaque
-- autre table à lecture publique (realisations, produits_boutique,
-- postes_carrieres) porte une distinction publié/brouillon qu'un `using(true)`
-- court-circuiterait. `medias_emplacements` n'a AUCUN état brouillon — chaque
-- ligne est une URL+alt destinée à être rendue publiquement dès qu'elle
-- existe, exactement comme les clés de src/lib/images.ts qu'elle remplace
-- progressivement. Le contenu de la table est donc déjà, par construction,
-- ce qu'un visiteur voit en clair dans le HTML rendu — `using(true)` n'expose
-- rien de plus. À documenter explicitement dans tout futur audit citant cette
-- cible : exception connue et motivée, pas une régression.
drop policy if exists "medias_lecture_cachee" on public.medias_emplacements;
create policy "medias_lecture_cachee"
  on public.medias_emplacements for select
  using (true);

drop policy if exists "medias_maj_admin" on public.medias_emplacements;
create policy "medias_maj_admin"
  on public.medias_emplacements for update
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- Pas de politique d'INSERT ni de DELETE : les neuf lignes sont posées une
-- fois par cette migration, l'écran admin (prompt suivant) ne fait que les
-- MODIFIER. Sans politique d'écriture pour INSERT/DELETE, ces opérations
-- restent fermées à tout le monde sauf service_role — cohérent avec « pas de
-- DELETE, l'interface n'en a pas besoin ».

grant select on public.medias_emplacements to anon, authenticated;
grant update on public.medias_emplacements to authenticated;


-- =============================================================================
-- NEUF LIGNES INITIALES
-- =============================================================================
-- `on conflict (cle) do nothing` : rejouer ce fichier (supabase db reset, par
-- exemple) ne doit pas écraser une valeur déjà modifiée depuis l'admin —
-- même règle que 0029 pour les réglages.
--
-- URLs complètes (project ref inclus), comme demandé pour `url_stockage`.
-- ⚠️ Portabilité : si ce projet obtient un jour un Supabase distinct pour
-- develop.ko-lab-center.ca (voir CLAUDE.md, section Domaine), ces neuf URLs
-- resteront pointées sur le projet ko-lab-site — à corriger à la main dans
-- cet environnement-là le cas échéant, elles ne se déduisent pas d'une
-- variable d'environnement comme le fait medias() dans images.ts.

insert into public.medias_emplacements (cle, url_stockage, alt_text_fr) values
  (
    'besoin_1',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/operations/preparation-terrain-2024.webp',
    'Équipe KO-LAB en préparation de déploiement, conditions hivernales'
  ),
  (
    'besoin_2',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/home/besoin-installer-2026.webp',
    'Structure de scène en montage, Fête du Canada Day 2026'
  ),
  (
    'besoin_3',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/home/besoin-fabriquer-kiosque-2025.webp',
    'Kiosque en bois fabriqué sur mesure par l''atelier KO-LAB'
  ),
  (
    'besoin_4',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/rental/location-mobilier-2026.webp',
    'Mobilier et aménagement de site loués pour un événement'
  ),
  (
    'capacite_installations',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/installations/terrasse-amenagee-2021.webp',
    'Terrasse aménagée avec pergola et mobilier sur mesure'
  ),
  (
    'lab_1',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/lab-machine-2026.webp',
    'Imprimante 3D en cours d''impression, atelier KO-LAB'
  ),
  (
    'lab_2',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/lab/precision-cablage-2024.webp',
    'Câblage de précision pour un déploiement pyrotechnique'
  ),
  (
    'operations_terrain',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/operations/operations-crew-2026.webp',
    'Équipe KO-LAB en opérations terrain'
  ),
  (
    'deployment_camion',
    'https://faagcojkghpbzndgnfoi.supabase.co/storage/v1/object/public/medias/deployment/deploiement-remorque-2026.webp',
    'Camion et remorque de déploiement KO-LAB, chargement de matériel'
  )
on conflict (cle) do nothing;


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- 1. select count(*) from public.medias_emplacements;
--    Attendu : 9.
--
-- 2. select cle, url_stockage from public.medias_emplacements order by cle;
--    Chaque URL doit répondre 200 (voir validation E2E, pas supposé).
--
-- 3. select cle from public.medias_emplacements
--    where alt_text_fr is null or alt_text_fr = '';
--    Attendu : 0 ligne. alt_text_en est NULL pour les neuf, par conception
--    (Phase 9 bilingue non commencée sur cette table).
--
-- 4. select policyname, cmd, roles from pg_policies
--    where schemaname='public' and tablename='medias_emplacements';
--    Attendu : 2 lignes (select ouvert, update restreint authenticated).
-- =============================================================================
