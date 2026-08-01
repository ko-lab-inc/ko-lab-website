-- =============================================================================
-- 0021 — Commandes : fondation du flux post-panier
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- ⚠️ Cette version REMPLACE une première version jamais exécutée (lien à
-- token) : Christian a tranché pour un vrai compte client avant même que la
-- première tombe en production — rien à défaire, rien à migrer.
--
-- Décision de Christian, 1er août 2026 : faire évoluer le panier de demande de
-- prix vers un vrai flux de commande — authentification du client (compte
-- Supabase Auth, session persistante), fenêtre de modification de 48h,
-- confirmation par courriel, toujours SANS paiement en ligne.
--
-- La migration 0006 l'annonçait déjà : « il n'existe AUCUNE commande en base…
-- un livreur n'a rien à se voir attribuer tant qu'une table commandes n'existe
-- pas ». Elle existe désormais. CETTE MIGRATION N'ASSIGNE RIEN à vendeur ni
-- livreur — décision de Christian : ça vient une fois qu'il y a du volume réel
-- à répartir, dans un prompt séparé.
--
-- -----------------------------------------------------------------------------
-- POURQUOI auth.users DIRECTEMENT, PAS profils
-- -----------------------------------------------------------------------------
-- `profils` reste réservée au PERSONNEL (admin/editor/vendeur/livreur) — c'est
-- elle que lit `get_user_role()`, et ses politiques ne doivent pas se mettre à
-- raisonner sur une population de milliers de clients. Un client de la
-- boutique obtient quand même une ligne `profils` (le trigger
-- `handle_new_user` s'applique à toute inscription, sans exception depuis le
-- premier jour) — rôle 'client' par défaut, comme n'importe qui d'autre qui
-- s'inscrit sur le site. Rien de nouveau ni de spécifique à gérer ici : cette
-- migration ne touche PAS ce trigger, et les politiques ci-dessous ne
-- consultent jamais `profils` pour la partie « client » — seulement
-- `auth.uid()`, directement.
--
-- -----------------------------------------------------------------------------
-- POURQUOI DEUX TABLES, ET PAS demandes_contact AVEC UNE COLONNE DE PLUS
-- -----------------------------------------------------------------------------
-- demandes_contact.message est un texte libre, généré une fois depuis le
-- panier puis figé. Impossible d'y relire « 3 unités du produit X » comme une
-- ligne modifiable. La fenêtre de 48h exige des lignes réelles, avec une
-- quantité qu'on peut réécrire — d'où `lignes_commande`, séparée de
-- `commandes`.
--
-- -----------------------------------------------------------------------------
-- LE PANIER PRÉ-COMMANDE N'EST PAS TOUCHÉ PAR CETTE MIGRATION
-- -----------------------------------------------------------------------------
-- Rien ici ne remplace PanierContext/localStorage : la navigation, l'ajout de
-- produits et l'ajustement des quantités restent anonymes et 100% côté
-- navigateur. Ces tables ne reçoivent une ligne qu'au moment où le panier
-- quitte le navigateur, une fois pour toutes, au clic sur « Confirmer ma
-- commande » — et ce clic exige désormais une session.
-- =============================================================================


-- =============================================================================
-- 1 · Numérotation — une SEQUENCE, jamais un COUNT(*) + 1
-- =============================================================================
--
-- Sous deux insertions concurrentes, « compter les lignes puis ajouter 1 »
-- peut produire deux fois le même numéro. Une séquence Postgres est atomique
-- par construction : c'est exactement le problème qu'elle règle depuis
-- toujours, pas la peine de le résoudre à la main.

create sequence if not exists public.commandes_numero_seq;


-- =============================================================================
-- 2 · Table commandes
-- =============================================================================

create table if not exists public.commandes (
  id                              uuid primary key default gen_random_uuid(),

  -- Le compte qui a passé la commande. `on delete cascade` : supprimer un
  -- compte auth.users (rare, mais possible depuis le dashboard) supprime ses
  -- commandes plutôt que de laisser une ligne orpheline qu'aucune politique
  -- ne pourrait plus jamais rattacher à personne.
  client_id                       uuid not null references auth.users (id) on delete cascade,

  -- CMD-2026-0001 — l'année lue à l'INSERTION (now()), jamais figée au moment
  -- où ce fichier est écrit ou rejoué.
  numero                          text not null unique default (
                                    'CMD-' || to_char(now(), 'YYYY') || '-' ||
                                    lpad(nextval('public.commandes_numero_seq')::text, 4, '0')
                                  ),

  -- Nom/courriel/téléphone restent des colonnes à part, même si l'e-mail est
  -- déjà connu via client_id → auth.users.email : une commande doit rester
  -- lisible telle quelle si le compte est un jour renommé ou supprimé, et
  -- l'équipe (admin/editor) n'a pas nécessairement accès à auth.users.
  nom                             text not null check (length(nom) between 2 and 120),
  email                           text not null check (length(email) between 5 and 200),
  telephone                       text check (coalesce(length(telephone), 0) <= 40),
  organisation                    text check (coalesce(length(organisation), 0) <= 200),

  mode_livraison                  text not null
                                  check (mode_livraison in ('expedition', 'ramassage')),
  -- Requise seulement si expédition — validée côté application (Zod), pas ici :
  -- une contrainte SQL conditionnelle sur deux colonnes serait plus rigide que
  -- ce dont un besoin encore mouvant a besoin.
  adresse_livraison               text check (coalesce(length(adresse_livraison), 0) <= 500),

  statut                          text not null default 'nouvelle' check (statut in (
                                    'nouvelle', 'confirmee', 'en_preparation',
                                    'prete', 'expediee', 'completee', 'annulee'
                                  )),

  fenetre_modification_expire_at  timestamptz not null default (now() + interval '48 hours'),

  created_at                      timestamptz not null default now()
);

alter sequence public.commandes_numero_seq owned by public.commandes.numero;

create index if not exists idx_commandes_client_id  on public.commandes (client_id);
create index if not exists idx_commandes_statut      on public.commandes (statut);
create index if not exists idx_commandes_created_at  on public.commandes (created_at desc);

comment on table public.commandes is
  'Commande post-panier — un compte auth.users par commande (client_id), '
  'fenêtre de modification de 48h. Pas de paiement en ligne (0021).';


-- =============================================================================
-- 3 · Table lignes_commande
-- =============================================================================

create table if not exists public.lignes_commande (
  id              uuid primary key default gen_random_uuid(),
  commande_id     uuid not null references public.commandes (id) on delete cascade,

  -- NULLABLE : si le produit est retiré du catalogue plus tard, la ligne doit
  -- survivre — c'est l'historique d'une commande, pas une vue en direct sur
  -- produits_boutique.
  produit_id      uuid references public.produits_boutique (id) on delete set null,

  -- Copies figées AU MOMENT DE LA COMMANDE, jamais relues depuis le catalogue
  -- après coup — même principe que candidatures.postes ou realisations.images :
  -- un produit renommé ou reprix ne doit pas réécrire silencieusement une
  -- commande déjà passée. C'est l'application (jamais le client) qui les
  -- calcule à partir de produits_boutique au moment de l'écriture, création
  -- comme modification — voir creerCommande / modifierCommande.
  nom_produit     text not null check (length(nom_produit) between 1 and 200),
  categorie       text not null check (length(categorie) between 1 and 60),
  quantite        integer not null check (quantite > 0 and quantite <= 99),
  prix_indicatif  numeric,

  created_at      timestamptz not null default now()
);

create index if not exists idx_lignes_commande_commande_id on public.lignes_commande (commande_id);

comment on table public.lignes_commande is
  'Lignes figées d''une commande — nom/catégorie/prix copiés au moment de '
  'l''écriture, jamais relus depuis produits_boutique après coup (0021).';


-- =============================================================================
-- 4 · RLS — auth.uid() natif, plus robuste qu'une vérification manuelle
-- =============================================================================
--
-- Un utilisateur authentifié ne voit et ne modifie QUE ses propres commandes.
-- `client_id = auth.uid()` est vérifié PAR POSTGRES à chaque ligne, que la
-- requête vienne de l'application ou d'un appel REST direct avec le jeton de
-- quelqu'un d'autre — contrairement à un token applicatif, `auth.uid()` ne
-- peut pas être falsifié depuis le client : il vient du JWT vérifié par
-- Supabase Auth, jamais d'un champ de formulaire.
--
-- L'ÉCRITURE (création ET modification) passe PAR RLS, avec le client de
-- SESSION — pas la service role key. Ce qui protège la fidélité des lignes
-- (nom/catégorie/prix jamais inventés par le client) n'est PAS le choix du
-- rôle Postgres : c'est le fait que l'application RE-DÉRIVE ces trois champs
-- depuis produits_boutique avant d'écrire quoi que ce soit, dans
-- creerCommande et dans l'action de modification. RLS décide QUI peut écrire
-- (le propriétaire, dans la fenêtre, au bon statut) ; l'application décide
-- CE QUI est écrit. Les deux sont nécessaires, aucun ne remplace l'autre.
--
-- Preuve attendue (script audit-supabase.mjs, et RLS testée explicitement
-- dans les E2E) : un compte A qui lit ou modifie l'`id` d'une commande du
-- compte B — même en le devinant exactement — obtient un tableau vide en
-- lecture, et zéro ligne affectée en écriture. Jamais une erreur qui
-- confirmerait que la ligne existe : RLS la rend simplement invisible.

alter table public.commandes       enable row level security;
alter table public.lignes_commande enable row level security;

-- --------------------------------------------------------------- commandes

drop policy if exists "commandes_lecture_client" on public.commandes;
create policy "commandes_lecture_client"
  on public.commandes for select
  to authenticated
  using (client_id = auth.uid());

drop policy if exists "commandes_lecture_equipe" on public.commandes;
create policy "commandes_lecture_equipe"
  on public.commandes for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "commandes_insertion_client" on public.commandes;
create policy "commandes_insertion_client"
  on public.commandes for insert
  to authenticated
  -- `statut = 'nouvelle'` : même leçon que l'audit du 2026-07-31 sur
  -- demandes_contact/candidatures — un `with check` qui se limite à
  -- l'appartenance laisserait quand même passer un statut fabriqué qui saute
  -- la file d'attente.
  with check (client_id = auth.uid() and statut = 'nouvelle');

drop policy if exists "commandes_maj_client" on public.commandes;
create policy "commandes_maj_client"
  on public.commandes for update
  to authenticated
  -- La fenêtre de 48h ET le statut sont vérifiés ICI, dans la politique — pas
  -- seulement en TypeScript. C'est le point que Christian a explicitement
  -- demandé : « du RLS standard Supabase, plus robuste que la vérification
  -- manuelle prévue avant ».
  using (
    client_id = auth.uid()
    and statut in ('nouvelle', 'confirmee')
    and now() < fenetre_modification_expire_at
  )
  with check (client_id = auth.uid());

drop policy if exists "commandes_maj_equipe" on public.commandes;
create policy "commandes_maj_equipe"
  on public.commandes for update
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'))
  with check (public.get_user_role() in ('admin', 'editor'));

-- Pas de policy DELETE du tout : personne ne supprime une commande, ni le
-- client ni l'équipe. `annulee` est un statut, pas une suppression.

-- ---------------------------------------------------------- lignes_commande
--
-- Une ligne n'a pas de `client_id` propre : l'appartenance se vérifie en
-- remontant à sa commande. D'où les sous-requêtes ci-dessous plutôt qu'une
-- colonne dupliquée qui pourrait diverger de commande_id.

drop policy if exists "lignes_commande_lecture_client" on public.lignes_commande;
create policy "lignes_commande_lecture_client"
  on public.lignes_commande for select
  to authenticated
  using (
    exists (
      select 1 from public.commandes c
      where c.id = lignes_commande.commande_id and c.client_id = auth.uid()
    )
  );

drop policy if exists "lignes_commande_lecture_equipe" on public.lignes_commande;
create policy "lignes_commande_lecture_equipe"
  on public.lignes_commande for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));

drop policy if exists "lignes_commande_insertion_client" on public.lignes_commande;
create policy "lignes_commande_insertion_client"
  on public.lignes_commande for insert
  to authenticated
  with check (
    exists (
      select 1 from public.commandes c
      where c.id = lignes_commande.commande_id
        and c.client_id = auth.uid()
        and c.statut in ('nouvelle', 'confirmee')
        and now() < c.fenetre_modification_expire_at
    )
  );

drop policy if exists "lignes_commande_suppression_client" on public.lignes_commande;
create policy "lignes_commande_suppression_client"
  on public.lignes_commande for delete
  to authenticated
  -- Une modification remplace TOUTES les lignes (delete + insert), jamais un
  -- update ligne à ligne — plus simple à garder cohérent avec un panier qui,
  -- lui non plus, ne "modifie" pas une ligne : il la retire ou la remplace.
  using (
    exists (
      select 1 from public.commandes c
      where c.id = lignes_commande.commande_id
        and c.client_id = auth.uid()
        and c.statut in ('nouvelle', 'confirmee')
        and now() < c.fenetre_modification_expire_at
    )
  );

-- Pas de policy UPDATE sur lignes_commande : voir plus haut, une modification
-- se fait en supprimant puis réinsérant, jamais en réécrivant une ligne.


-- =============================================================================
-- 5 · GRANT — le strict nécessaire, rien par défaut
-- =============================================================================
--
-- `anon` NE REÇOIT AUCUN GRANT sur `commandes` ni `lignes_commande` : la
-- confirmation exige désormais une session, `anon` n'a donc plus aucune
-- raison de toucher ces tables, à aucun moment du parcours.
--
-- `authenticated` ne reçoit QUE ce que les politiques ci-dessus couvrent
-- réellement — pas de delete sur commandes (personne ne supprime), pas
-- d'update sur lignes_commande (remplacées par delete + insert, jamais
-- réécrites en place).
--
-- `service_role` n'a besoin d'aucun GRANT explicite : 0004 l'a réglé une fois
-- pour toutes avec `alter default privileges … grant all privileges … to
-- service_role`, qui couvre toute table créée depuis par ce même rôle —
-- confirmé par 0016/0017/0019/0020, qui ne le re-déclarent jamais. Cela dit,
-- AUCUN code applicatif de cette fonctionnalité n'utilise la service role
-- key : la création et la modification passent toutes deux par le client de
-- SESSION, précisément pour que ce soit RLS qui décide, et non un rôle qui la
-- contourne.

grant select, insert, update on public.commandes       to authenticated;
grant select, insert, delete on public.lignes_commande to authenticated;


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- 1. Les deux tables existent, RLS active, policies en place :
--
--      select tablename, rowsecurity from pg_tables
--      where schemaname = 'public' and tablename in ('commandes', 'lignes_commande');
--      -- attendu : rowsecurity = true sur les deux
--
--      select tablename, policyname, cmd from pg_policies
--      where schemaname = 'public' and tablename in ('commandes', 'lignes_commande')
--      order by tablename, cmd;
--      -- attendu : 6 sur commandes (2 select, 1 insert, 2 update — client et
--      -- équipe séparés), 4 sur lignes_commande (2 select, 1 insert, 1 delete)
--
-- 2. anon ne peut RIEN faire, avec ou sans filtre — depuis un terminal, avec
--    la clé anon publique :
--
--      curl -s -o /dev/null -w '%{http_code}\n' \
--        "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/commandes?select=*" \
--        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"          # attendu : 401
--
-- 3. La numérotation ne collisionne pas — deux insertions immédiates (service
--    role, dans l'éditeur SQL) doivent produire deux numéros distincts.
--    Remplacer <un-uuid-existant-dans-auth.users> par un vrai id de test, et
--    supprimer les deux lignes ensuite :
--
--      insert into commandes (client_id, nom, email, mode_livraison)
--        values ('<un-uuid-existant-dans-auth.users>','t1','t1@example.test','ramassage'),
--               ('<un-uuid-existant-dans-auth.users>','t2','t2@example.test','ramassage')
--        returning numero;
--      -- attendu : CMD-2026-000N et CMD-2026-000(N+1), jamais le même
--
-- 4. RLS croisée — le test qui compte le plus. Avec deux comptes A et B
--    (jetons de session réels, PAS la clé anon ni la service role) :
--    A crée une commande, B tente de la lire par son id exact.
--    Attendu : select renvoie 0 ligne pour B, jamais une erreur ni la ligne.
--
-- `npm run audit:supabase` refera le point 2 automatiquement une fois étendu.
-- =============================================================================
