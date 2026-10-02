-- =============================================================================
-- 0052 — adresse postale affichée
-- =============================================================================
--
-- ⚠️ À EXÉCUTER PAR MOUSSA DANS LE SQL EDITOR SUPABASE, projet ko-lab-site.
-- Idempotente — `on conflict (cle) do nothing`. NON destructive.
--
-- -----------------------------------------------------------------------------
-- CONTEXTE
-- -----------------------------------------------------------------------------
-- Demande de Christian, 2 octobre 2026. Le site n'affiche aujourd'hui que
-- « Outaouais, Québec » (réglage `contact_region`) : un secteur desservi, pas
-- une adresse. L'adresse réelle est publique sur la page Facebook de KO-LAB
-- depuis longtemps — aucune question de confidentialité, seulement une
-- information qui manquait au site.
--
-- -----------------------------------------------------------------------------
-- POURQUOI UNE CLÉ SÉPARÉE, ET PAS `contact_region` RÉUTILISÉE
-- -----------------------------------------------------------------------------
-- `contact_region` est décrite comme « Secteur affiché sous les coordonnées »
-- et sert `areaServed` dans les données structurées — le TERRITOIRE desservi.
-- Une adresse de rue y est une autre chose : le LIEU de l'entreprise, qui sert
-- `address`. Les confondre ferait mentir le libellé de l'écran d'administration
-- et enverrait une adresse de rue là où Google attend une zone de service.
--
-- -----------------------------------------------------------------------------
-- RÉSERVE ASSUMÉE — UN SEUL CHAMP, PAS QUATRE
-- -----------------------------------------------------------------------------
-- schema.org préfère une adresse DÉCOMPOSÉE (streetAddress, addressLocality,
-- postalCode, addressRegion, addressCountry) : c'est ce qui alimente les
-- résultats enrichis et la fiche d'établissement.
--
-- Ce réglage est un champ de texte libre, affiché tel quel et émis comme
-- `address` au format texte — ce que schema.org accepte, mais qui ne donnera
-- pas de résultat enrichi. C'est un choix : quatre champs à remplir pour une
-- adresse qui ne changera jamais, c'est quatre occasions de se tromper, et le
-- gain reste hypothétique tant que `ko-lab-center.ca` n'est pas indexé (voir
-- CLAUDE.md, section Domaine).
--
-- Si KO-LAB vise un jour la fiche Google Business, il faudra décomposer. La
-- migration sera simple : ce champ deviendra `streetAddress` et trois clés
-- s'ajouteront.
-- -----------------------------------------------------------------------------

insert into public.reglages (cle, valeur, description, publique) values
  (
    'contact_adresse',
    '',
    'Adresse postale affichée (pied de page, page Contact, données structurées). Vide = la ligne n''apparaît pas. Distincte de contact_region, qui est le SECTEUR DESSERVI et non le lieu de l''entreprise.',
    true
  )
on conflict (cle) do nothing;


-- =============================================================================
-- VÉRIFICATION APRÈS EXÉCUTION
-- =============================================================================
-- 1) La clé existe et est vide (doit renvoyer une ligne, valeur '') :
--    select cle, valeur, publique from public.reglages where cle = 'contact_adresse';
--
-- 2) Le total (doit renvoyer 15) :
--    select count(*) from public.reglages;
