-- =============================================================================
-- 0011 — Réglages du site, modifiables depuis l'espace équipe
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--
-- Le site continue de fonctionner sans cette migration : `lireReglages()`
-- retombe sur les valeurs d'environnement et les fichiers de traduction quand
-- la table est absente. Rien ne casse, rien n'est modifiable non plus.
--
-- -----------------------------------------------------------------------------
-- CE QUE CETTE TABLE CONTIENT, ET CE QU'ELLE NE CONTIENDRA PAS
-- -----------------------------------------------------------------------------
-- Elle contient ce qui change SANS toucher au code : les coordonnées, et les
-- deux drapeaux qui décident si une partie du site est ouverte.
--
-- ⚠️ Elle ne contiendra PAS les textes du site. Ils vivent dans
-- messages/fr.json et messages/en.json, versionnés avec le code : une
-- formulation se relit en revue, se compare d'une version à l'autre et se
-- revient en arrière. Déplacer ça en base, c'est perdre l'historique et
-- réinventer un gestionnaire de contenu — un autre chantier, avec sa propre
-- interface d'édition et sa propre discipline de relecture.
--
-- -----------------------------------------------------------------------------
-- POURQUOI UNE TABLE CLÉ-VALEUR ET NON UNE COLONNE PAR RÉGLAGE
-- -----------------------------------------------------------------------------
-- Une table à une seule ligne et une colonne par réglage impose une migration
-- à chaque ajout. Ici, une insertion suffit. Le prix à payer est le typage :
-- tout est texte en base, et c'est le schéma Zod côté application qui décide
-- de la forme réelle. C'est le bon endroit — la règle y est lisible et
-- corrigeable sans toucher au schéma.

create table if not exists public.reglages (
  cle          text primary key,
  valeur       text not null default '',
  -- Documente à quoi sert la clé, pour la personne qui ouvre la table dans
  -- six mois sans le contexte.
  description  text,
  -- `public` : la valeur peut-elle être lue sans être identifié ? Le courriel
  -- de contact est affiché sur le site, donc oui. Une clé d'API, non.
  publique     boolean not null default false,
  modifie_le   timestamptz not null default now()
);

alter table public.reglages enable row level security;

-- -----------------------------------------------------------------------------
-- POLITIQUES
-- -----------------------------------------------------------------------------
-- Lecture publique des seules lignes marquées `publique`. Le site est rendu
-- côté serveur avec la clé anon : sans cette politique, les coordonnées
-- n'apparaîtraient nulle part.

drop policy if exists "reglages_lecture_publique" on public.reglages;
create policy "reglages_lecture_publique"
  on public.reglages for select
  using (publique = true);

-- L'équipe voit tout, y compris les réglages non publics.
drop policy if exists "reglages_lecture_equipe" on public.reglages;
create policy "reglages_lecture_equipe"
  on public.reglages for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

-- ⚠️ Écriture réservée à l'ADMIN, pas à l'équipe. Un réglage gouverne le site
-- entier : fermer la boutique ou changer l'adresse de réception des demandes
-- n'est pas du même ordre que corriger la fiche d'un produit.
drop policy if exists "reglages_maj_admin" on public.reglages;
create policy "reglages_maj_admin"
  on public.reglages for update
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- Pas de politique INSERT ni DELETE, volontairement. Les clés sont posées ici,
-- par migration : elles font partie du code, puisque c'est le code qui les
-- lit. Une clé créée depuis l'interface ne serait lue par personne, et une
-- clé supprimée ferait retomber le site sur sa valeur de repli sans que
-- personne comprenne pourquoi.

-- ⚠️ RLS ET GRANT SONT INDÉPENDANTS. Sans ces GRANT, tout renvoie 42501 même
-- pour service_role — c'est ce qui avait rendu toutes les tables inaccessibles
-- avant 0004.
grant select on public.reglages to anon, authenticated;
grant update on public.reglages to authenticated;
grant all privileges on public.reglages to service_role;

-- -----------------------------------------------------------------------------
-- VALEURS DE DÉPART
-- -----------------------------------------------------------------------------
-- Reprennent EXACTEMENT ce qui est en vigueur aujourd'hui, pour que passer
-- cette migration ne change rien de visible. `on conflict do nothing` : rejouer
-- le fichier ne doit pas écraser une valeur ajustée depuis l'interface.

insert into public.reglages (cle, valeur, description, publique) values
  (
    'contact_courriel',
    'info@ko-lab.ca',
    'Adresse qui reçoit les demandes du formulaire, et qui est affichée sur le site.',
    true
  ),
  (
    'contact_telephone',
    '',
    'Téléphone affiché sur la page Contact. Vide = la ligne n''apparaît pas.',
    true
  ),
  (
    'contact_region',
    'Outaouais, Québec',
    'Secteur affiché sous les coordonnées.',
    true
  ),
  (
    'panier_actif',
    'true',
    'Panier de demande groupée. false retire le panier de la boutique et de la navigation.',
    true
  ),
  (
    'solutions_modulaires',
    'true',
    'Catégorie Conteneurs et solutions modulaires dans la boutique.',
    true
  )
on conflict (cle) do nothing;

-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--   select cle, valeur, publique from public.reglages order by cle;
--
-- Attendu : cinq lignes, toutes publiques.
--
-- Puis, depuis le dépôt, avec la clé ANON — donc dans les conditions d'un
-- visiteur :
--
--   npm run audit:supabase
--
-- La section « Réglages » doit confirmer la lecture publique ET le refus
-- d'écriture.
