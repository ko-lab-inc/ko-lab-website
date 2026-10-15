-- 0059 — Notification sortante vers JARVIS à chaque nouvelle demande de LOCATION.
--
-- Objectif : prévenir JARVIS-BOSSE en temps réel dès qu'une ligne est INSÉRÉE
-- dans demandes_contact avec type = 'location'. POST HTTP vers un webhook n8n,
-- authentifié par un en-tête X-Jarvis-Token dont la valeur vit dans le Vault
-- (jamais dans ce dépôt). Validé par le Boss le 14 octobre 2026 (Option 2 :
-- trigger versionné + pg_net + secret en Vault).
--
-- -----------------------------------------------------------------------------
-- PRÉ-REQUIS (à faire AVANT d'exécuter cette migration)
--
-- 1. Extensions actives : `pg_net` et `supabase_vault`
--    (Dashboard → Database → Extensions ; vérif :
--     select extname from pg_extension where extname in ('pg_net','supabase_vault');)
-- 2. Le secret posé dans le Vault sous le nom `jarvis_webhook_token`
--    (voir le SQL vault.create_secret fourni séparément, exécuté par le Boss —
--     JAMAIS commité ici : ce fichier ne contient aucun secret).
--
-- Si le secret est absent au moment d'un INSERT, l'envoi est simplement sauté
-- (warning), l'insertion n'échoue pas.
--
-- -----------------------------------------------------------------------------
-- CE QUE CETTE MIGRATION NE FAIT PAS
--
-- Aucune modification des colonnes existantes, aucune RLS touchée. Elle AJOUTE
-- une fonction et un trigger AFTER INSERT. INSERT seulement (pas UPDATE/DELETE),
-- et uniquement type = 'location' (pas de bruit, pas de données des autres
-- demandes envoyées dehors).
--
-- -----------------------------------------------------------------------------
-- NON BLOQUANT — une demande ne doit JAMAIS être perdue
--
-- `net.http_post` (pg_net) met l'appel en file et rend la main aussitôt : la
-- latence ou l'indisponibilité de JARVIS ne retarde pas l'insertion. En plus,
-- TOUTE la logique (lecture du Vault COMPRISE) est enveloppée dans un seul bloc
-- d'exception : si quoi que ce soit échoue ici — Vault inaccessible, pg_net
-- absent, JARVIS down — on journalise un warning et l'INSERT est quand même
-- validé. La demande est d'abord en base ; la notification est un bonus
-- best-effort. Aucune panne de notification ne peut annuler une demande.
--
-- SECURITY DEFINER : le trigger lit `vault.decrypted_secrets`, accessible au
-- propriétaire de la fonction (postgres), pas au rôle qui insère (service role
-- via /api/contact). `search_path = ''` + objets pleinement qualifiés : motif
-- SECURITY DEFINER sûr, rien n'est résolu via un search_path détournable.

create or replace function public.notifier_jarvis_demande_location()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  v_token text;
  -- URL NON secrète (constante assumée). Pour la changer un jour : nouvelle
  -- migration, ou la déplacer en second secret Vault si elle devient sensible.
  v_url   text := 'https://n8n-xqae.srv1893857.hstgr.cloud/webhook/demande-site';
begin
  -- UN SEUL bloc gardé, lecture du Vault incluse : rien ici ne peut faire
  -- échouer l'INSERT (voir l'en-tête « NON BLOQUANT »).
  begin
    select decrypted_secret
      into v_token
      from vault.decrypted_secrets
     where name = 'jarvis_webhook_token';

    if v_token is null then
      raise warning 'notifier_jarvis: secret "jarvis_webhook_token" absent du Vault — POST non envoyé, demande % conservée', new.id;
      return null;  -- AFTER trigger : la valeur de retour est ignorée.
    end if;

    perform net.http_post(
      url     := v_url,
      -- Format STANDARD, non transformé — c'est exactement ce que JARVIS lit.
      -- record = to_jsonb(NEW) = la ligne entière insérée (équivaut à row_to_json).
      body    := jsonb_build_object(
                   'type',   'INSERT',
                   'table',  'demandes_contact',
                   'record', to_jsonb(new)
                 ),
      headers := jsonb_build_object(
                   'Content-Type',  'application/json',
                   'X-Jarvis-Token', v_token
                 )
    );
  exception when others then
    -- Jamais bloquant : aucune panne (Vault, pg_net, réseau) n'annule l'insertion.
    raise warning 'notifier_jarvis: notification non envoyée (%), demande % conservée', sqlerrm, new.id;
  end;

  return null;
end;
$$;

comment on function public.notifier_jarvis_demande_location() is
  'Notifie JARVIS (webhook n8n) à chaque INSERT de demande type=location. En-tete X-Jarvis-Token lu depuis le Vault (jarvis_webhook_token). Non bloquant. Voir 0059.';

-- `create trigger` n'a pas de « or replace » : on retire d'abord l'éventuel
-- existant pour que la migration soit rejouable sans erreur.
drop trigger if exists trg_notifier_jarvis_demande_location on public.demandes_contact;

create trigger trg_notifier_jarvis_demande_location
  after insert on public.demandes_contact
  for each row
  when (new.type = 'location')
  execute function public.notifier_jarvis_demande_location();
