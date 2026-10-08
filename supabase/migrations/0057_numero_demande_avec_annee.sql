-- =============================================================================
-- 0057 — Le numéro de demande porte l'année
-- =============================================================================
-- Le compteur de 0056 démarrait à 1001 et donnait 1001, 1002, 1003…
--
-- Deux défauts, constatés en regardant l'écran de Rentman le 8 octobre 2026 :
--
-- 1. COLLISION. Les deux demandes de démonstration livrées par Rentman portent
--    les numéros 1003 et 1004. Notre compteur passe exactement par là : la
--    colonne « Numéro » de Rentman pouvait donc afficher le même nombre pour
--    deux choses sans rapport.
--
-- 2. ILLISIBLE. « 1008 » ne dit rien. « 20260001 » se lit d'un coup d'œil :
--    première demande de 2026.
--
-- -----------------------------------------------------------------------------
-- POURQUOI QUATRE CHIFFRES APRÈS L'ANNÉE, ET PAS TROIS
-- -----------------------------------------------------------------------------
-- `2026001` serait plus court, mais trois chiffres plafonnent à 999. Le
-- compteur ne se remet pas à zéro chaque année (voir plus bas) : au-delà de
-- 999 demandes, `2026 * 1000 + 1000` vaudrait 2027000, et viendrait écraser la
-- numérotation de l'année suivante. Quatre chiffres repoussent ça à 9999,
-- soit des décennies au rythme d'une entreprise de location.
--
-- -----------------------------------------------------------------------------
-- LE COMPTEUR NE SE REMET PAS À ZÉRO CHAQUE ANNÉE, ET C'EST VOULU
-- -----------------------------------------------------------------------------
-- Le suffixe est donc un rang GLOBAL, pas « la nième demande de cette année ».
-- En 2027, la 250ᵉ demande depuis le début donnera 20270250.
--
-- C'est assumé. Une remise à zéro annuelle exigerait une table de compteurs et
-- une fonction SECURITY DEFINER, donc une surface de sécurité de plus à tenir,
-- pour un gain purement cosmétique : personne n'a besoin de savoir que c'est la
-- 12ᵉ demande de l'année. Ce qui compte, c'est que le numéro soit unique, qu'il
-- porte la bonne année, et qu'il ne ressemble à rien d'autre dans Rentman.
-- Les trois tiennent avec une simple séquence.
--
-- ⚠️ `external_reference` chez Rentman n'accepte qu'un ENTIER. 20260001 en est
-- un (le maximum d'un `integer` PostgreSQL est 2 147 483 647, on est loin).
-- Tout format à lettres ou à tirets, type « LOC-2026-001 », est impossible.
-- =============================================================================

-- Le nouveau défaut : année courante (fuseau du Québec, pas celui du serveur)
-- suivie du rang. `now()` est volatile, ce qu'un DEFAULT accepte parfaitement.
alter table public.demandes_contact
  alter column numero
  set default (
    extract(year from (now() at time zone 'America/Toronto'))::int * 10000
    + nextval('public.demandes_numero_seq')::int
  );

-- Renumérotation des lignes déjà en base, pour ne pas laisser cohabiter deux
-- formats. Rang GLOBAL dans l'ordre d'arrivée — la MÊME logique que le DEFAULT
-- ci-dessus (qui utilise `nextval`, global), pour que l'existant et le futur se
-- numérotent de façon cohérente. L'année, elle, vient du `created_at` propre à
-- chaque ligne. Toutes les lignes actuelles datent de 2026, donc rang global et
-- rang annuel coïncident aujourd'hui ; la distinction ne portera que sur les
-- années suivantes, et c'est le rang global qui fait foi.
with ordonnees as (
  select
    id,
    extract(year from (created_at at time zone 'America/Toronto'))::int as annee,
    row_number() over (order by created_at, id) as rang
  from public.demandes_contact
)
update public.demandes_contact d
set numero = o.annee * 10000 + o.rang::int
from ordonnees o
where o.id = d.id;

-- La séquence repart au nombre de lignes existantes : la prochaine demande
-- prend donc le rang suivant, sans trou ni collision avec ce qu'on vient
-- d'écrire. `setval(..., n)` fait que le prochain `nextval` rend n + 1.
select setval(
  'public.demandes_numero_seq',
  greatest((select count(*) from public.demandes_contact), 1)
);

comment on column public.demandes_contact.numero is
  'Numéro lisible AAAA + rang (ex. 20260001), partagé avec Rentman via external_reference. Voir 0057.';
