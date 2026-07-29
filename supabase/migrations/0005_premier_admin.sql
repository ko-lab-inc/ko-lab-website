-- =============================================================================
-- 0005 — Premier compte administrateur
-- =============================================================================
--
-- ⚠️ À EXÉCUTER APRÈS AVOIR CRÉÉ LE COMPTE, pas avant. Voir l'étape 1.
--
-- Contexte : au 29 juillet 2026, le projet ne contient AUCUN compte
-- (auth.users vide, profils vide). Vérifié après l'exécution de 0004. Il faut
-- donc amorcer le premier administrateur à la main — c'est le seul qui ne peut
-- pas être créé par un administrateur existant.
--
-- -----------------------------------------------------------------------------
-- ÉTAPE 1 — Créer le compte (tableau de bord, PAS ici)
-- -----------------------------------------------------------------------------
-- Authentication -> Users -> Add user -> Create new user
--   Email          : web@ko-lab.ca
--   Password       : choisi par Moussa, jamais transmis par écrit
--   Auto Confirm   : COCHÉ
--
-- « Auto Confirm » est nécessaire : le projet exige la confirmation par
-- courriel (Confirm email activé), et sans serveur SMTP configuré le message
-- de confirmation ne partirait pas. Le compte resterait inutilisable.
--
-- Le mot de passe se choisit dans l'interface, il ne transite donc ni par ce
-- fichier, ni par Git, ni par une conversation.
--
-- La création déclenche on_auth_user_created (0001), qui insère le profil
-- correspondant avec le rôle par défaut — désormais 'invite' depuis 0004,
-- c'est-à-dire aucun droit. D'où l'étape 2.
--
-- -----------------------------------------------------------------------------
-- ÉTAPE 2 — Élever ce compte (ce fichier)
-- -----------------------------------------------------------------------------

-- Filet de sécurité : sans cette vérification, un courriel mal orthographié
-- donnerait « UPDATE 0 » — un succès silencieux — et le compte resterait sans
-- droits sans que personne ne le remarque avant la première connexion.
do $$
declare
  cible constant text := 'web@ko-lab.ca';
  trouve int;
begin
  select count(*) into trouve from public.profils where email = cible;

  if trouve = 0 then
    raise exception
      'Aucun profil pour %. Créer le compte à l''étape 1 avant d''exécuter ce fichier.', cible;
  end if;

  update public.profils set role = 'admin' where email = cible;
  raise notice 'Rôle admin accordé à %.', cible;
end $$;

-- -----------------------------------------------------------------------------
-- VÉRIFICATION
-- -----------------------------------------------------------------------------
--   select p.email, p.role, u.email_confirmed_at is not null as confirme
--   from public.profils p join auth.users u on u.id = p.id;
--
-- Attendu : une seule ligne, role = 'admin', confirme = true.
--
-- -----------------------------------------------------------------------------
-- LES SUIVANTS NE PASSENT PAS PAR ICI
-- -----------------------------------------------------------------------------
-- Ce fichier amorce le PREMIER admin, et lui seul. Les comptes suivants
-- (Christian, tout autre membre) se créent depuis l'espace admin par
-- invitation : l'inscription publique est fermée, et un compte fraîchement
-- créé arrive en 'invite' — sans droits — jusqu'à ce qu'un admin l'élève.
-- Ne pas dupliquer ce fichier pour chaque personne.
