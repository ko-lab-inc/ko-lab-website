-- 0058 — Analytique interne : capture des visites.
--
-- Suivi de trafic maison, branché le 13 octobre 2026 après que Vercel Web
-- Analytics n'ait jamais reçu d'événement (le paquet @vercel/analytics tire une
-- dépendance SvelteKit qui exige vite@8, en conflit avec notre vite@7 de test —
-- ERESOLVE, et l'install Vercel échouait pareil). On capture donc nous-mêmes.
--
-- -----------------------------------------------------------------------------
-- VIE PRIVÉE (Loi 25) — AUCUNE DONNÉE PERSONNELLE
--
-- Pas de cookie, pas d'IP stockée, pas d'URL complète. `visiteur_jour` est un
-- hash journalier NON RÉVERSIBLE (sha256 de ip+user-agent+date+secret, calculé
-- côté serveur, jamais stocké en clair) : il permet de compter les visiteurs
-- uniques d'une journée sans suivre personne d'un jour à l'autre — le modèle
-- de Plausible/Vercel. `referrer` ne garde que le DOMAINE de provenance, jamais
-- l'URL. Donc pas de bannière de consentement nécessaire.
--
-- -----------------------------------------------------------------------------
-- ACCÈS
--
-- Écriture : UNIQUEMENT /api/stats, avec le service role (qui outrepasse la
-- RLS). Aucune policy d'insertion pour anon/authenticated : le public ne peut
-- pas écrire directement dans PostgREST.
--
-- Lecture : /admin/analytique, avec le client de SESSION sous RLS — policy
-- « équipe » comme toutes les autres tables d'admin (0002), jamais le service
-- role pour l'affichage. La donnée est non personnelle, mais on reste sur la
-- même discipline que le reste de l'espace.

create table if not exists public.evenements_visite (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  -- Chemin de la page, préfixe de langue compris (/fr/location). Sans query ni
  -- ancre : nettoyé côté serveur avant insertion.
  chemin text not null,
  -- Domaine de provenance (google.com, facebook.com…) ou 'direct'. Jamais l'URL.
  referrer text,
  -- Code pays ISO fourni par l'en-tête Vercel `x-vercel-ip-country`, ou null.
  pays text,
  -- 'mobile' | 'tablette' | 'bureau' | null.
  appareil text,
  -- 'fr' | 'en' | null.
  locale text,
  -- Hash anonyme journalier (voir en-tête). Compte les visiteurs uniques du jour.
  visiteur_jour text not null
);

comment on table public.evenements_visite is
  'Analytique interne cookieless (0058). Aucune donnee personnelle : visiteur_jour est un hash journalier non reversible, pas d IP ni URL stockee. Ecrit par /api/stats (service role), lu par /admin/analytique (equipe, RLS).';

-- `cree_le desc` : toutes les lectures filtrent sur une fenêtre récente et
-- lisent du plus récent au plus ancien. `chemin` : agrégation « top pages ».
create index if not exists evenements_visite_cree_le_idx on public.evenements_visite (cree_le desc);
create index if not exists evenements_visite_chemin_idx on public.evenements_visite (chemin);

alter table public.evenements_visite enable row level security;

-- Remise à plat des privilèges par défaut, comme 0019 pour candidatures :
-- défense en profondeur si une policy était ajoutée par erreur plus tard.
revoke all on public.evenements_visite from anon, authenticated;

-- L'équipe lit (le client de session passe la RLS). get_user_role() vient de
-- 0002 (SECURITY DEFINER, lit public.profils). Pas de policy insert/update/
-- delete : seul le service role écrit, et il outrepasse la RLS.
grant select on public.evenements_visite to authenticated;

create policy "evenements_visite_lecture_equipe"
  on public.evenements_visite
  for select
  to authenticated
  using (public.get_user_role() in ('admin', 'editor'));
