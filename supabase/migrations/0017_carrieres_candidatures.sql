-- =============================================================================
-- 0017 — Les neuf postes réels, et les candidatures reçues
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- -----------------------------------------------------------------------------
-- CE QUE FAIT CETTE MIGRATION
-- -----------------------------------------------------------------------------
-- 1. Remplace les trois postes de démonstration par les NEUF postes réels
--    fournis par Christian.
-- 2. Crée `candidatures`, qui reçoit le formulaire de candidature du site.
-- 3. Crée le bucket de CV — PRIVÉ, contrairement à tous les autres buckets
--    de ce projet.
--
-- Décision de Christian : le formulaire vit sur le site plutôt que sur le
-- Google Form existant, « même formulaire pour tous les postes ». Les
-- candidatures arrivent donc dans cette base, pas dans un Sheets.

-- =============================================================================
-- 1 · LES NEUF POSTES
-- =============================================================================
--
-- Les trois lignes de démonstration (opérateur, superviseur, chef d'équipe)
-- n'ont jamais été saisies en base : la page publique les lisait depuis les
-- fichiers de traduction. Rien à supprimer, donc — on insère.
--
-- ⚠️ `type` : les neuf descriptions fournies ne précisent PAS le régime
-- d'emploi. `temps-plein` est une VALEUR DE DÉPART, pas une information
-- confirmée — la colonne est NOT NULL et il fallait bien en mettre une.
-- Christian ajuste chaque poste en un clic depuis /admin/carrieres, où les
-- cinq régimes sont proposés (temps plein, temps partiel, contrat,
-- saisonnier, étudiant — ces deux derniers ajoutés par 0015).
--
-- `exigences_fr` : une exigence par ligne. C'est le format que lit
-- lib/carrieres.ts, et celui qu'affiche le champ du formulaire admin.

insert into public.postes_carrieres (titre_fr, departement, type, description_fr, exigences_fr, actif, ordre)
values
  (
    'Main-d''œuvre logistique événementielle',
    'Logistique événementielle',
    'temps-plein',
    'Vous appuyez les équipes terrain dans le montage, le démontage et la manutention sur les sites d''événements. Idéal pour quelqu''un qui aime le travail physique, le rythme intense des productions live et la diversité des chantiers.',
    'Bonne forme physique, à l''aise avec le levage et le déplacement de matériel
Capacité à travailler en équipe sous pression
Disponibilité variable, incluant soirs et fins de semaine
Esprit débrouillard et orienté solutions
Permis de conduire valide (atout)',
    true, 10
  ),
  (
    'Chef d''équipe terrain',
    'Logistique événementielle',
    'temps-plein',
    'Vous dirigez une équipe de techniciens sur les chantiers, du briefing matinal jusqu''au démontage final. Vous portez la responsabilité du déroulement, de la sécurité et de la qualité de l''exécution sur place.',
    'Expérience démontrée en gestion d''équipe terrain (minimum 2 ans)
Leadership calme, capacité à prendre des décisions rapidement
Lecture de plans et coordination avec les régisseurs de salle
Connaissance des normes de sécurité sur les chantiers
Bilinguisme français-anglais (atout marqué)',
    true, 20
  ),
  (
    'Installateur spécialisé',
    'Installation',
    'temps-plein',
    'Vous installez nos enseignes, structures, habillages et décors chez les clients et sur sites événementiels. Travail varié, parfois en hauteur, qui exige autant de minutie que de force physique.',
    'Expérience en installation de signalétique ou de décors (idéalement 3 ans+)
Aisance avec les outils manuels et électriques
Travail en hauteur (nacelle, échafaud — certification un atout)
Souci du détail et finitions propres
Permis de conduire valide',
    true, 30
  ),
  (
    'Chauffeur-livreur',
    'Transport & logistique',
    'temps-plein',
    'Vous prenez la route avec notre matériel — équipement, structures, signalétique — vers les sites de production partout au Québec et en Ontario. Vous êtes le maillon entre l''atelier et le terrain.',
    'Permis de conduire classe 5 (classe 3 ou 1 un atout fort)
Expérience en conduite de camion ou remorque
Bonne tenue de cargaison : sangles, plans de chargement, ancrages
Sens de la ponctualité et autonomie sur la route
Capacité à participer à la manutention au déchargement',
    true, 40
  ),
  (
    'Technicien polyvalent',
    'Atelier',
    'temps-plein',
    'Vous touchez à tout dans l''atelier KO-LAB : découpe, assemblage, finition, montage, prototypage. Un rôle parfait pour quelqu''un qui aime apprendre, varier les tâches et ne jamais s''ennuyer.',
    'Bases solides en travail du bois, de l''acrylique et des métaux légers
Aisance avec les outils d''atelier (scies, ponceuses, perceuses, etc.)
Capacité à lire des plans techniques simples
Soin et précision dans l''exécution
Curiosité technique et envie d''apprendre',
    true, 50
  ),
  (
    'Technicien 3D',
    'Lab créatif',
    'temps-plein',
    'Vous opérez nos imprimantes 3D résine et filament, du préchargement des fichiers jusqu''aux finitions des pièces. Vous travaillez de pair avec l''équipe créative pour livrer des prototypes et petites séries précis.',
    'Connaissance des principes d''impression 3D (FDM et résine)
Aisance avec les logiciels de slicing et la préparation de fichiers STL
Notions de modélisation 3D un atout (Fusion 360, SolidWorks, Blender)
Soin dans les finitions (ponçage, post-traitement, peinture)
Sens de l''organisation; gérer plusieurs impressions en parallèle',
    true, 60
  ),
  (
    'Opérateur d''équipement',
    'Opérations',
    'temps-plein',
    'Vous maîtrisez nos équipements de production : découpeuse laser, CNC, machines à imprimer grand format. Vous êtes la personne qui transforme un fichier en pièce livrable.',
    'Expérience en opération de machines-outils (laser, CNC ou impression grand format)
Lecture de fichiers vectoriels et préparation de jobs
Sens des matériaux et réglages adaptés à chaque support
Entretien préventif et gestion des consommables
Souci de la sécurité en atelier',
    true, 70
  ),
  (
    'Coordonnateur de projets',
    'Administration & coordination',
    'temps-plein',
    'Vous orchestrez le déroulement des mandats KO-LAB : échéances, ressources, communication client. Vous êtes le point de contact entre l''équipe atelier, l''équipe terrain et les clients.',
    'Expérience en coordination de projets (idéalement en fabrication ou événementiel)
Excellente communication, écrite et verbale
Sens de l''organisation et gestion de plusieurs dossiers en parallèle
Aisance avec les outils de gestion (Excel, Trello ou équivalent)
Bilinguisme français-anglais',
    true, 80
  ),
  (
    'Administration & coordination',
    'Bureau',
    'temps-plein',
    'Vous appuyez l''administration de KO-LAB : facturation, suivi des contrats, communications internes, coordination logistique du bureau. Un rôle pivot qui garde toute la machine en mouvement.',
    'Expérience en administration ou support à la coordination
Maîtrise de la suite Office (Excel, Word, Outlook)
Sens de la confidentialité et de l''organisation
Bilinguisme français-anglais
Notions de facturation ou comptabilité de base un atout',
    true, 90
  );

-- =============================================================================
-- 2 · CANDIDATURES
-- =============================================================================
--
-- Reprend les champs du formulaire Google que Christian utilisait, à
-- l'identique — c'est lui qui a défini ce qu'il a besoin de savoir.
--
-- ⚠️ `postes` en text[] et non une clé étrangère vers postes_carrieres :
-- le formulaire est le MÊME pour tous les postes et accepte plusieurs choix
-- (« Cochez tout ce qui s'applique »). Surtout, une candidature doit
-- survivre à la fermeture d'un poste : une clé étrangère la ferait
-- disparaître ou bloquerait la suppression de l'offre. On garde donc les
-- intitulés tels qu'ils étaient au moment de postuler.

create table if not exists public.candidatures (
  id             uuid primary key default gen_random_uuid(),

  nom            text not null,
  telephone      text not null,
  email          text not null,
  ville          text not null,

  postes         text[] not null default '{}',
  disponibilites text not null,

  -- Deux questions fermées du formulaire d'origine.
  travail_exterieur boolean not null,
  a_experience      boolean not null,
  experience_texte  text,

  -- Chemin dans le bucket privé `cv`. NULL = aucun CV joint (le formulaire
  -- ne l'exige pas, pas plus que celui de Christian).
  cv_chemin      text,

  source         text,

  statut         text not null default 'nouveau'
                 check (statut in ('nouveau', 'lu', 'traite')),

  created_at     timestamptz not null default now()
);

create index if not exists idx_candidatures_created on public.candidatures (created_at desc);
create index if not exists idx_candidatures_statut  on public.candidatures (statut);

alter table public.candidatures enable row level security;

-- Dépôt public : c'est un formulaire de candidature ouvert à tous.
drop policy if exists "candidatures_insertion_publique" on public.candidatures;
create policy "candidatures_insertion_publique"
  on public.candidatures for insert
  with check (true);

-- ⚠️ AUCUNE politique de lecture publique, délibérément — même raisonnement
-- que demandes_contact (0002) : une lecture anonyme exposerait nom,
-- téléphone, courriel et parcours de chaque candidat.
drop policy if exists "candidatures_lecture_equipe" on public.candidatures;
create policy "candidatures_lecture_equipe"
  on public.candidatures for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "candidatures_maj_equipe" on public.candidatures;
create policy "candidatures_maj_equipe"
  on public.candidatures for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "candidatures_suppression_admin" on public.candidatures;
create policy "candidatures_suppression_admin"
  on public.candidatures for delete
  to authenticated
  using (public.get_user_role() = 'admin');

grant insert on public.candidatures to anon;
grant select, insert, update, delete on public.candidatures to authenticated;

-- =============================================================================
-- 3 · BUCKET DES CV — PRIVÉ
-- =============================================================================
--
-- ⚠️ `public = false`, SEUL BUCKET DE CE PROJET DANS CE CAS. Les trois
-- autres (produits, realisations, et les photos en général) sont publics
-- parce qu'une photo de produit est faite pour être vue. Un CV, non : c'est
-- un document personnel, avec adresse, téléphone et parcours. Public, il
-- serait lisible par quiconque devine l'URL — et indexable.
--
-- L'espace équipe y accède par URL SIGNÉE, valable quelques minutes
-- (voir l'action telechargerCv). Aucune politique de lecture n'est donc
-- accordée à `anon`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv',
  'cv',
  false,
  10485760, -- 10 Mo, comme le formulaire Google d'origine
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Dépôt anonyme autorisé : le candidat n'a pas de compte. Le nom du fichier
-- est fabriqué côté serveur (jamais celui fourni par le visiteur), et le
-- bucket n'accepte que trois types MIME avec un plafond de taille.
drop policy if exists "cv_depot_public" on storage.objects;
create policy "cv_depot_public"
  on storage.objects for insert
  with check (bucket_id = 'cv');

-- Lecture réservée à l'équipe. Sans cette politique, même une URL signée
-- échouerait.
drop policy if exists "cv_lecture_equipe" on storage.objects;
create policy "cv_lecture_equipe"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'cv' and public.get_user_role() in ('admin', 'editor'));

drop policy if exists "cv_suppression_admin" on storage.objects;
create policy "cv_suppression_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'cv' and public.get_user_role() = 'admin');

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select count(*) from public.postes_carrieres where actif;
--   -- Attendu : 9.
--
--   select id, public, file_size_limit from storage.buckets where id = 'cv';
--   -- Attendu : une ligne, public = FALSE, 10485760.
--
--   select count(*) from public.candidatures;
--   -- Attendu : 0 au départ.
