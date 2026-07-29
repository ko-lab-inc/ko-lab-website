-- =============================================================================
-- 0004 — Privilèges manquants, et fermeture d'une élévation de privilège
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
--    En une seule fois : les deux parties ne doivent pas être séparées, voir
--    l'avertissement de la partie B.
--
-- -----------------------------------------------------------------------------
-- CE QUI NE VA PAS AUJOURD'HUI
-- -----------------------------------------------------------------------------
--
-- 1. AUCUNE TABLE N'EST ACCESSIBLE. 0001 crée les tables, 0002 active le RLS et
--    pose vingt politiques — mais aucun GRANT n'a jamais été exécuté. Or en
--    PostgreSQL les deux sont nécessaires et indépendants : le GRANT ouvre la
--    porte, la politique RLS décide qui passe. Sans GRANT, la politique n'est
--    même pas évaluée.
--
--    Vérifié le 29 juillet 2026 contre le projet en ligne :
--
--        GET /rest/v1/demandes_contact  (clé anon)     -> 401
--        GET /rest/v1/demandes_contact  (clé service)  -> 403
--        {"code":"42501","message":"permission denied for table demandes_contact"}
--
--    Une table VRAIMENT absente répond 404/PGRST205 — ce n'est donc pas un
--    problème de schéma manquant, c'est bien un problème de privilèges. Et ça
--    touche jusqu'à service_role, qui contourne pourtant le RLS.
--
--    Conséquence concrète : le formulaire de contact du site échoue en 500 à
--    chaque envoi et n'enregistre rien. Toute demande reçue depuis la mise en
--    ligne est perdue. Le reste du site tient debout parce que son contenu est
--    encore en dur dans le code.
--
-- 2. TOUTE PERSONNE QUI S'INSCRIT DEVIENT ÉDITEUR DU SITE.
--    Détaillé dans la partie B. C'est le point le plus grave, et il devient
--    exploitable au moment précis où la partie A répare les accès.
--
-- =============================================================================
-- PARTIE A — Privilèges
-- =============================================================================
-- Calqués sur les politiques de 0002, pas plus larges. Un GRANT trop généreux
-- ne se voit pas : c'est le RLS qui semble tenir, jusqu'au jour où une
-- politique est retirée par erreur.

grant usage on schema public to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- service_role — contourne le RLS, c'est lui qui porte les écritures serveur
-- (api/contact). Sans privilège il ne peut rien, RLS contourné ou non.
-- -----------------------------------------------------------------------------
grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- -----------------------------------------------------------------------------
-- anon — le visiteur non connecté. La clé « publishable » qui l'incarne est
-- livrée dans le bundle du navigateur : tout ce qu'on accorde ici est accordé
-- à la Terre entière. Le RLS filtre ensuite sur `publie`.
-- -----------------------------------------------------------------------------
grant select on public.realisations      to anon;
grant select on public.produits_boutique to anon;
grant select on public.postes_carrieres  to anon;

-- demandes_contact : INSERT SEULEMENT, JAMAIS SELECT.
-- La table contient noms, courriels et téléphones. 0002 ne prévoit
-- délibérément aucune politique de lecture publique ; le GRANT doit suivre la
-- même discipline, sinon il suffirait qu'une politique saute pour exposer le
-- carnet de contacts entier.
grant insert on public.demandes_contact to anon;

-- profils : rien pour anon. Pas de GRANT du tout.

-- -----------------------------------------------------------------------------
-- authenticated — l'équipe connectée. Le RLS distingue ensuite admin d'editor
-- (seul l'admin supprime).
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.realisations      to authenticated;
grant select, insert, update, delete on public.produits_boutique to authenticated;
grant select, insert, update, delete on public.postes_carrieres  to authenticated;
grant select, insert, update, delete on public.demandes_contact  to authenticated;
grant select, update                 on public.profils           to authenticated;

-- -----------------------------------------------------------------------------
-- Fonctions appelées DEPUIS les politiques.
-- get_user_role() est SECURITY DEFINER, mais le rôle appelant doit tout de même
-- avoir le droit de l'exécuter — sinon chaque politique d'équipe échoue.
-- -----------------------------------------------------------------------------
grant execute on function public.get_user_role() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Tables et séquences créées PLUS TARD.
-- Sans ceci, la prochaine migration recrée exactement le même problème.
--
-- ⚠️ ALTER DEFAULT PRIVILEGES ne vaut que pour les objets créés par le rôle qui
-- exécute cette commande. Exécuter ce fichier avec le même rôle que les
-- migrations suivantes (le SQL Editor Supabase utilise `postgres`).
-- -----------------------------------------------------------------------------
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
alter default privileges in schema public
  grant select on tables to anon, authenticated;

-- =============================================================================
-- PARTIE B — Élévation de privilège par simple inscription
-- =============================================================================
--
-- ⚠️ NE PAS EXÉCUTER LA PARTIE A SANS CELLE-CI.
--
-- Trois éléments anodins pris séparément, ouverts bout à bout :
--
--   1. `profils.role` a pour valeur par défaut 'editor'   (0001, ligne 122)
--   2. le trigger on_auth_user_created crée un profil à CHAQUE inscription
--   3. l'inscription publique est OUVERTE sur le projet en ligne
--      (auth/v1/settings -> "disable_signup": false, relevé le 29 juillet 2026)
--
-- La clé publishable étant publique par conception, n'importe qui sur Internet
-- peut donc créer un compte et se retrouve 'editor'. Ce que 0002 accorde à un
-- editor : écriture sur realisations, produits_boutique et postes_carrieres,
-- et surtout LECTURE COMPLÈTE de demandes_contact — le carnet de contacts,
-- noms, courriels et téléphones compris.
--
-- Aujourd'hui c'est inerte, faute de privilèges. La partie A le rend vivant.
-- D'où l'ordre : on ferme avant d'ouvrir.
--
-- Le correctif : un troisième rôle sans aucun droit, qui devient la valeur par
-- défaut. S'inscrire ne donne alors plus rien du tout ; un admin élève
-- ensuite le compte à la main. get_user_role() renverra 'invite', qui ne
-- correspond à aucune politique de 0002 — aucune autre modification n'est
-- nécessaire.

alter table public.profils drop constraint if exists profils_role_check;

alter table public.profils
  add constraint profils_role_check
  check (role in ('admin', 'editor', 'invite'));

alter table public.profils alter column role set default 'invite';

-- =============================================================================
-- APRÈS EXÉCUTION — trois vérifications, dans cet ordre
-- =============================================================================
--
-- 1. Des comptes ont-ils déjà été créés pendant que la porte était ouverte ?
--    La valeur par défaut ne touche PAS les lignes existantes.
--
--        select p.id, p.email, p.role, u.created_at
--        from public.profils p
--        join auth.users u on u.id = p.id
--        order by u.created_at;
--
--    Tout compte inconnu doit passer en 'invite' ou être supprimé.
--    Le compte de Christian, lui, doit être élevé :
--
--        update public.profils set role = 'admin' where email = '<courriel de Christian>';
--
-- 2. Fermer l'inscription publique.
--    Tableau de bord Supabase -> Authentication -> Sign In / Providers ->
--    décocher « Allow new users to sign up ». KO-LAB compte deux ou trois
--    comptes : ils se créent par invitation, pas par formulaire ouvert. Le
--    correctif de la partie B rend l'inscription inoffensive, cette étape la
--    rend inutile.
--
-- 3. Confirmer que les accès sont rétablis, depuis le dépôt :
--
--        curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/realisations?select=id&limit=1" \
--             -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
--
--    Attendu : 200 et un tableau JSON (vide si la table l'est), plus aucun 42501.
