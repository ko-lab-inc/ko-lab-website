-- =============================================================================
-- 0046 — Mission NERF : fondation (inscriptions_nerf, etat_zone_nerf)
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR CHRISTIAN DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente et rejouable — chaque instruction est `if not exists` / `drop
-- policy if exists` / `on conflict do nothing`.
--
-- Chantier indépendant des LOTs A à F (site vitrine) : dashboard plein écran
-- affiché sur une TV pendant les événements Expérience Mobile, alimenté par
-- les décharges signées via un Google Form. Ce fichier ne pose QUE les deux
-- tables — ni la route qui les alimente (voir la route POST du dépôt), ni
-- l'écran lui-même (prompt à venir).
--
-- -----------------------------------------------------------------------------
-- CE QUE inscriptions_nerf NE CONTIENT PAS — décision du brief, pas un oubli
-- -----------------------------------------------------------------------------
-- Courriel, téléphone, adresse, signature, contact d'urgence, lien avec le
-- participant, conditions médicales : tout ça reste dans le Google Sheet lié
-- au formulaire. Cette table ne reçoit que ce que le dashboard doit compter
-- ou afficher — une ligne par PARTICIPANT (jusqu'à 5 par soumission), pas une
-- ligne par décharge.
--
-- -----------------------------------------------------------------------------
-- ⚠️ date_evenement N'A PAS DE VALEUR PAR DÉFAUT — VOLONTAIRE
-- -----------------------------------------------------------------------------
-- Un `default current_date` semblait le choix évident, et c'est justement le
-- piège : `current_date` se calcule dans le fuseau de LA BASE (UTC sur
-- Supabase), pas dans celui de l'événement (Outaouais, Québec — Eastern).
-- L'Expérience Mobile tourne en soirée : à partir d'environ 20 h (HAE) / 19 h
-- (HNE), UTC a déjà basculé au jour calendaire suivant alors qu'il fait
-- encore « aujourd'hui » sur place. Une inscription reçue à ce moment-là se
-- serait vue attribuer la MAUVAISE date par un défaut calculé côté base — et
-- silencieusement absente du compteur « aujourd'hui » pile pendant la plage
-- horaire la plus chargée.
--
-- La colonne est donc NOT NULL sans défaut : c'est la route POST qui calcule
-- la date dans le fuseau America/Toronto et la fournit explicitement à
-- CHAQUE insertion (voir sa docstring, fonction `dateEvenementQuebec()`). Si
-- ce calcul est un jour oublié dans le code applicatif, l'insertion échoue
-- avec une violation NOT NULL — visible et bruyante — plutôt que de stocker
-- silencieusement une date fausse.
--
-- -----------------------------------------------------------------------------
-- LECTURE PUBLIQUE DU DASHBOARD : PAR ROUTE API, PAS PAR anon+RLS
-- -----------------------------------------------------------------------------
-- Recommandation retenue (voir le rapport de la conversation) : le dashboard
-- lit ces données via une route API server-side (client service role), qui
-- ne renvoie au navigateur que la forme déjà agrégée/filtrée dont l'écran a
-- besoin (compteurs, 4 dernières lignes avec PRÉNOM SEUL). Deux raisons :
--
--   1. RLS filtre des LIGNES, jamais des COLONNES. Une policy SELECT même
--      restreinte à `date_evenement = current_date` laisserait un client
--      demander `select=nom,age` sur ces mêmes lignes — le prénom n'est pas
--      isolable de nom/age par une policy RLS seule.
--   2. « Décharges complétées » = COUNT(DISTINCT decharge_id) — une forme que
--      l'API REST de PostgREST ne produit pas nativement sur la table de
--      base ; il faudrait soit une RPC, soit renvoyer toute la colonne
--      decharge_id au navigateur pour la dédupliquer côté client.
--
-- Conséquence directement posée par CE fichier : AUCUNE policy RLS n'est
-- créée pour `anon` ni `authenticated`, sur AUCUNE des deux tables. Seul
-- `service_role` (qui contourne RLS) y touche — exactement le rôle que
-- porte la route POST et que portera la future route de lecture.
--
-- -----------------------------------------------------------------------------
-- ⚠️ GRANT SELECT AUTOMATIQUE — 0004, alter default privileges
-- -----------------------------------------------------------------------------
-- La migration 0004 a posé une règle de privilèges par défaut qui s'applique
-- à TOUTE future table du schéma public :
--
--     alter default privileges in schema public
--       grant select on tables to anon, authenticated;
--
-- Les deux tables ci-dessous reçoivent donc AUTOMATIQUEMENT un GRANT SELECT
-- pour `anon` et `authenticated` dès leur création, sans qu'aucune ligne de
-- CE fichier ne le demande. Ce n'est pas un problème EN SOI — RLS activé
-- sans policy bloque déjà tout — mais laisser ce GRANT en place reviendrait à
-- compter uniquement sur RLS pour protéger des noms et des âges d'enfants.
-- Section 3 le RÉVOQUE explicitement pour les deux tables : double verrou,
-- pas un doublon inutile. Si une policy RLS permissive est ajoutée par
-- erreur dans une migration future, le GRANT manquant bloque quand même tout
-- accès anon/authenticated — et vice-versa.
--
-- Aucun GRANT explicite à `service_role` n'apparaît ci-dessous : la même
-- migration 0004 le lui accorde déjà automatiquement sur toute future table
-- (`alter default privileges ... grant all privileges on tables to
-- service_role`). Rien à ajouter ici pour que la route POST fonctionne.
-- =============================================================================


-- =============================================================================
-- 1 · TABLE inscriptions_nerf — une ligne par participant
-- =============================================================================

create table if not exists public.inscriptions_nerf (
  id              uuid primary key default gen_random_uuid(),
  -- Horodatage de réception par NOTRE route, pas l'horodatage de soumission
  -- du Google Form (que la route ne reçoit pas) — c'est ce qui trie
  -- « dernières inscriptions ».
  recu_le         timestamptz not null default now(),
  prenom          text not null check (char_length(trim(prenom)) > 0),
  nom             text not null check (char_length(trim(nom)) > 0),
  -- smallint largement suffisant, borne haute réaliste posée contre une
  -- erreur de saisie (« 999 »), pas contre un âge réellement plausible.
  age             smallint not null check (age > 0 and age < 130),
  -- Partagé par toutes les lignes d'UNE MÊME soumission (jusqu'à 5) — généré
  -- par la route POST, jamais par la base : c'est ce qui permet de compter
  -- les décharges séparément des participants (COUNT DISTINCT).
  decharge_id     uuid not null,
  statut          text not null default 'valide',
  -- Voir la note d'en-tête : PAS de défaut, fournie explicitement par la
  -- route dans le fuseau de l'événement.
  date_evenement  date not null
);

-- Sert les deux compteurs qui filtrent sur date_evenement : « participants
-- aujourd'hui » (count(*)) et « décharges complétées » (count(distinct
-- decharge_id)) — une seule requête sur (date_evenement, decharge_id) sert
-- les deux, sans avoir à lire nom/prenom/age pour compter.
create index if not exists idx_inscriptions_nerf_date_decharge
  on public.inscriptions_nerf (date_evenement, decharge_id);

-- Sert « dernières inscriptions » (order by recu_le desc limit 4) — table
-- appelée à grossir vite en pleine soirée, ce tri ne doit jamais dépendre
-- d'un scan complet.
create index if not exists idx_inscriptions_nerf_recu_le
  on public.inscriptions_nerf (recu_le desc);


-- =============================================================================
-- 2 · TABLE etat_zone_nerf — une seule ligne, l'état courant
-- =============================================================================
--
-- `verrou_singleton` : idiome standard pour garantir UNE SEULE ligne au
-- niveau base — un boolean contraint à valoir toujours `true` (check) et
-- porteur d'une contrainte UNIQUE. Une deuxième ligne, quelle qu'elle soit,
-- violerait forcément l'unicité de `true`. Préféré à un simple
-- `id` fixe codé en dur : cette table garde son `id uuid` habituel, cohérent
-- avec le reste du schéma.

create table if not exists public.etat_zone_nerf (
  id                       uuid primary key default gen_random_uuid(),
  zone_ouverte             boolean not null default false,
  -- Heure seule (pas timestamptz) : réglée à la main par le staff pour la
  -- soirée en cours, jamais lue comme un instant absolu multi-jour.
  prochain_depart          time,
  derniere_remise_a_zero   timestamptz,
  verrou_singleton         boolean not null default true,
  constraint etat_zone_nerf_verrou_vrai check (verrou_singleton),
  constraint etat_zone_nerf_ligne_unique unique (verrou_singleton)
);

-- La ligne unique elle-même — idempotent : rejouer cette migration n'en crée
-- pas une seconde (bloqué par etat_zone_nerf_ligne_unique de toute façon,
-- mais on conflict évite l'erreur bruyante à chaque réexécution).
insert into public.etat_zone_nerf (zone_ouverte, prochain_depart, derniere_remise_a_zero)
values (false, null, null)
on conflict (verrou_singleton) do nothing;


-- =============================================================================
-- 3 · RLS — activé, ZÉRO policy sur les deux tables, GRANT anon/authenticated révoqué
-- =============================================================================
-- Voir la note d'en-tête (« LECTURE PUBLIQUE DU DASHBOARD » et « GRANT SELECT
-- AUTOMATIQUE ») pour le raisonnement complet. Personne d'autre que
-- service_role ne doit pouvoir lire ou écrire ces deux tables par PostgREST.

alter table public.inscriptions_nerf enable row level security;
alter table public.etat_zone_nerf    enable row level security;

-- Révoque le GRANT SELECT posé automatiquement par la règle de privilèges
-- par défaut de 0004 — ceinture ET bretelles avec RLS ci-dessus, voir la
-- note d'en-tête pour pourquoi les deux verrous sont volontaires. `revoke`
-- sur un privilège jamais accordé (insert/update/delete, jamais donnés par
-- la règle de 0004) ne produit pas d'erreur : sans risque à rejouer.
revoke all on public.inscriptions_nerf from anon, authenticated;
revoke all on public.etat_zone_nerf    from anon, authenticated;

-- Aucune ligne `create policy` ici — c'est délibéré, pas incomplet.


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================
--
-- 1. select count(*) from public.inscriptions_nerf;
--    -- attendu : 0 (table neuve, aucune route ne l'alimente encore tant que
--    la route POST n'est pas déployée).
--
-- 2. select * from public.etat_zone_nerf;
--    -- attendu : exactement 1 ligne — zone_ouverte = false,
--    prochain_depart = null, derniere_remise_a_zero = null.
--
-- 3. Sonde anonyme (clé anon) — DOIT échouer avant même RLS, signature
--    42501 attendue, PAS un tableau vide :
--
--      curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/inscriptions_nerf?select=*&limit=1" \
--           -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--           -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
--      -- attendu : {"code":"42501","message":"permission denied for table
--      inscriptions_nerf"}. Un tableau vide `[]` signalerait que le GRANT
--      SELECT automatique (0004) est toujours en place et que seule RLS
--      bloque — un des deux verrous aurait sauté silencieusement.
--
--    Même sonde sur etat_zone_nerf : même attendu.
--
-- 4. Sonde service_role — DOIT réussir, RLS contourné :
--
--      curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/inscriptions_nerf" \
--           -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
--           -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
--           -H "Content-Type: application/json" \
--           -H "Prefer: return=representation" \
--           -d '{"prenom":"AUDIT_TEST","nom":"AUDIT_TEST","age":10,
--                "decharge_id":"00000000-0000-0000-0000-000000000000",
--                "date_evenement":"2026-08-31"}'
--      -- attendu : 201, une ligne. Nettoyer immédiatement :
--      delete from public.inscriptions_nerf where prenom = 'AUDIT_TEST';
--
-- 5. npm run verifier:migrations
--    -- ce script extrait les colonnes via `alter table ... add column` : il
--    ne verra donc pas les colonnes des deux `create table` ci-dessus (même
--    angle mort documenté par 0043). Il devrait en revanche voir les deux
--    lignes `revoke` — à confirmer en le lançant après exécution.
-- =============================================================================
